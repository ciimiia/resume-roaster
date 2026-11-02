/**
 * Orchestrates one "/api/jobs/matches" request: hard filters + vector
 * retrieval, cache lookup, a capped/rate-limited LLM re-rank for whatever
 * isn't already cached, then assembles the final sorted list. See
 * lib/matching/retrieve.ts, lib/matching/rerank.ts, lib/db/jobMatches.ts.
 */
import 'server-only'
import { getApprovedProfileForMatching, getProfileForUser } from '@/lib/db/profiles'
import { getJobPreferencesForUser } from '@/lib/db/jobPreferences'
import { getBlockedCompanyNormalizedSet } from '@/lib/db/blockedCompanies'
import { listHiddenJobIds } from '@/lib/db/hiddenJobs'
import { listSavedJobIds } from '@/lib/db/savedJobs'
import { getCachedMatches, upsertMatches, type CachedMatch } from '@/lib/db/jobMatches'
import { retrieveCandidateJobs, type MatchCandidate } from './retrieve'
import { rerankJobs } from './rerank'
import { buildProfileText } from './profileText'
import { checkRateLimit } from '@/lib/rateLimit'
import { EMPTY_JOB_PREFERENCES } from '@/lib/resumeProfile'

const RETRIEVE_LIMIT = 40 // vector top-N pulled before re-rank trims further
const RERANK_LIMIT = 15 // how many of those get an LLM re-rank per request
const RERANK_DAILY_CAP = 30 // LLM re-rank *calls* (one call covers up to RERANK_LIMIT jobs), per user per day

export interface JobMatchItem extends Omit<MatchCandidate, 'descriptionText'> {
  matchScore: number
  strengths: string[]
  gaps: string[]
  missingKeywords: string[]
  recommendation: string
  saved: boolean
}

export type GetMatchesResult =
  | { ok: true; needsApproval: false; items: JobMatchItem[]; rerankCapped: boolean }
  | { ok: true; needsApproval: true }

function toItem(candidate: MatchCandidate, match: CachedMatch, saved: Set<string>): JobMatchItem {
  return {
    id: candidate.id,
    source: candidate.source,
    company: candidate.company,
    title: candidate.title,
    location: candidate.location,
    remoteType: candidate.remoteType,
    applyUrl: candidate.applyUrl,
    sourceUrl: candidate.sourceUrl,
    attributionLabel: candidate.attributionLabel,
    salaryMin: candidate.salaryMin,
    salaryMax: candidate.salaryMax,
    salaryCurrency: candidate.salaryCurrency,
    salaryPredicted: candidate.salaryPredicted,
    postedAt: candidate.postedAt,
    matchScore: match.matchScore,
    strengths: match.strengths,
    gaps: match.gaps,
    missingKeywords: match.missingKeywords,
    recommendation: match.recommendation,
    saved: saved.has(candidate.id),
  }
}

export async function getJobMatches(userId: string): Promise<GetMatchesResult> {
  const approvedProfile = await getApprovedProfileForMatching(userId)
  if (!approvedProfile) return { ok: true, needsApproval: true }

  const [preferences, blockedCompanies, hiddenJobIds, savedJobIds] = await Promise.all([
    getJobPreferencesForUser(userId),
    getBlockedCompanyNormalizedSet(),
    listHiddenJobIds(userId),
    listSavedJobIds(userId),
  ])

  const candidates = await retrieveCandidateJobs({
    profileEmbedding: approvedProfile.embedding,
    preferences: preferences ?? EMPTY_JOB_PREFERENCES,
    blockedCompaniesNormalized: blockedCompanies,
    hiddenJobIds,
    limit: RETRIEVE_LIMIT,
  })

  const profileApprovedAt = new Date(approvedProfile.approvedAt)
  const candidateIds = candidates.map(c => c.id)
  const cached = await getCachedMatches(userId, candidateIds, profileApprovedAt)

  const toRerank = candidates.filter(c => !cached.has(c.id)).slice(0, RERANK_LIMIT)
  let rerankCapped = false

  if (toRerank.length > 0) {
    const rate = await checkRateLimit(`rerank:user:${userId}`, RERANK_DAILY_CAP, 86_400)
    if (!rate.allowed) {
      rerankCapped = true
    } else {
      const profile = await getProfileForUser(userId)
      if (profile) {
        const result = await rerankJobs(buildProfileText(profile), toRerank)
        if (result.ok && result.results.length > 0) {
          const freshMatches: CachedMatch[] = result.results.map(r => ({
            jobId: r.jobId,
            matchScore: r.matchScore,
            strengths: r.strengths,
            gaps: r.gaps,
            missingKeywords: r.missingKeywords,
            recommendation: r.recommendation,
          }))
          await upsertMatches(userId, profileApprovedAt, freshMatches)
          for (const m of freshMatches) cached.set(m.jobId, m)
        }
      }
    }
  }

  // Only jobs with an actual score (cached from this run or a prior one at
  // the same profile version) are returned — a candidate that's neither
  // cached nor freshly ranked (re-rank capped, or the LLM call failed)
  // is dropped rather than shown with a fake/zero score.
  const items = candidates
    .filter(c => cached.has(c.id))
    .map(c => toItem(c, cached.get(c.id)!, savedJobIds))
    .sort((a, b) => b.matchScore - a.matchScore)

  return { ok: true, needsApproval: false, items, rerankCapped }
}
