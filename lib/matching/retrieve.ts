/**
 * Hard-filtered vector retrieval — the first stage of matching. SQL does
 * everything that's indexable/cheap (status, remote type, country
 * substring, language, company exclusion, hidden jobs) plus the cosine
 * ordering; lib/matching/filters.ts's seniority check runs afterward in
 * application code since it's regex-inferred from the title, not a column.
 */
import { and, eq, inArray, notInArray, sql, isNull, or, cosineDistance } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import type { JobPreferences } from '@/lib/resumeProfile'
import { filterBySeniority } from './filters'

export interface MatchCandidate {
  id: string
  source: string
  company: string
  title: string
  location: string | null
  remoteType: string | null
  descriptionText: string
  applyUrl: string
  sourceUrl: string
  attributionLabel: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPredicted: boolean
  postedAt: string | null
}

export interface RetrieveParams {
  profileEmbedding: number[]
  preferences: JobPreferences
  blockedCompaniesNormalized: Set<string>
  hiddenJobIds: Set<string>
  /** How many candidates to pull via vector similarity before the (in-app) seniority filter and before re-rank trims further. */
  limit: number
}

export async function retrieveCandidateJobs(params: RetrieveParams): Promise<MatchCandidate[]> {
  const db = getDb()
  const { preferences } = params

  const excludedNormalized = new Set([
    ...params.blockedCompaniesNormalized,
    ...preferences.excludedCompanies.map(c => c.trim().toLowerCase()),
  ])

  const conditions = [eq(schema.jobs.status, 'active')]

  if (preferences.remoteType.length > 0) {
    conditions.push(inArray(schema.jobs.remoteType, preferences.remoteType))
  }

  if (preferences.countries.length > 0) {
    conditions.push(
      or(...preferences.countries.map(c => sql`${schema.jobs.location} ILIKE ${'%' + c + '%'}`))!
    )
  }

  if (preferences.languages.length > 0) {
    // Inclusive: a job with no detected language passes through rather
    // than being excluded — see lib/db/schema.ts's jobs.language comment
    // and the module doc above.
    conditions.push(or(isNull(schema.jobs.language), inArray(schema.jobs.language, preferences.languages))!)
  }

  // Hidden jobs are a small per-user set fetched by the caller, cheaper to
  // pass as a NOT IN list here than to join a table for it.
  const hiddenIds = [...params.hiddenJobIds]
  if (hiddenIds.length > 0) {
    conditions.push(notInArray(schema.jobs.id, hiddenIds))
  }

  if (excludedNormalized.size > 0) {
    conditions.push(notInArray(sql`lower(${schema.jobs.company})`, [...excludedNormalized]))
  }

  // Jobs without an embedding yet (just ingested, not yet picked up by the
  // embedding cron — see lib/jobIngestion/embedRunner.ts) can't be ordered
  // by similarity; they're simply not candidates for this run, not an error.
  conditions.push(sql`${schema.jobs.embedding} IS NOT NULL`)

  const rows = await db.select({
    id: schema.jobs.id,
    source: schema.jobs.source,
    company: schema.jobs.company,
    title: schema.jobs.title,
    location: schema.jobs.location,
    remoteType: schema.jobs.remoteType,
    descriptionText: schema.jobs.descriptionText,
    applyUrl: schema.jobs.applyUrl,
    sourceUrl: schema.jobs.sourceUrl,
    attributionLabel: schema.jobs.attributionLabel,
    salaryMin: schema.jobs.salaryMin,
    salaryMax: schema.jobs.salaryMax,
    salaryCurrency: schema.jobs.salaryCurrency,
    salaryPredicted: schema.jobs.salaryPredicted,
    postedAt: schema.jobs.postedAt,
  }).from(schema.jobs)
    .where(and(...conditions))
    .orderBy(cosineDistance(schema.jobs.embedding, params.profileEmbedding))
    .limit(params.limit)

  const candidates: MatchCandidate[] = rows.map(r => ({ ...r, postedAt: r.postedAt?.toISOString() ?? null }))
  return filterBySeniority(candidates, preferences.seniority)
}
