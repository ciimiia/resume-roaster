/**
 * Integration test against the real Neon DB — covers the three things
 * that genuinely need a live query to verify (unlike the pure zod/regex
 * checks in test-rerankInjection.ts and test-matchingFilters.ts):
 *
 *   1. Hard filters in lib/matching/retrieve.ts actually exclude what they
 *      should (remote type, blocked company, hidden jobs) — not just
 *      "the code looks right".
 *   2. Match-score cache invalidation (lib/db/jobMatches.ts): a cached row
 *      is only returned when the profileApprovedAt it was cached against
 *      matches exactly — a different version (i.e. the profile changed)
 *      must come back empty, not stale.
 *   3. Ownership: saved jobs, hidden jobs, and cached match scores are all
 *      strictly per-user — one user's actions/cache are invisible to another.
 *
 * Creates its own two throwaway users + three throwaway jobs + one
 * blocked-company row, then deletes everything it created (even on
 * failure).
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-matchingIntegration.ts
 */

import { eq } from 'drizzle-orm'
import { getDb, schema } from '../lib/db'
import { createUser } from '../lib/db/users'
import { blockCompany, unblockCompany } from '../lib/db/blockedCompanies'
import { hideJobForUser, listHiddenJobIds } from '../lib/db/hiddenJobs'
import { saveJobForUser, listSavedJobIds } from '../lib/db/savedJobs'
import { getCachedMatches, upsertMatches } from '../lib/db/jobMatches'
import { retrieveCandidateJobs } from '../lib/matching/retrieve'
import { EMPTY_JOB_PREFERENCES } from '../lib/resumeProfile'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const DIMENSIONS = 1536
// Two fixed-but-distinct unit-ish vectors — jobs "near" vectorA should sort
// ahead of jobs "near" vectorB when querying with vectorA. Exact numbers
// don't matter, only that they're consistently different.
const vectorA = Array.from({ length: DIMENSIONS }, (_, i) => (i % 7 === 0 ? 1 : 0))
const vectorB = Array.from({ length: DIMENSIONS }, (_, i) => (i % 7 === 0 ? -1 : 0))

async function main() {
  const db = getDb()
  const stamp = Date.now()
  let userA: Awaited<ReturnType<typeof createUser>> | null = null
  let userB: Awaited<ReturnType<typeof createUser>> | null = null
  let blockedCompanyId: string | null = null
  const jobIds: string[] = []

  try {
    userA = await createUser(`matching-test-a-${stamp}@example.com`, 'not-a-real-hash')
    userB = await createUser(`matching-test-b-${stamp}@example.com`, 'not-a-real-hash')

    const insertedJobs = await db.insert(schema.jobs).values([
      {
        source: 'greenhouse', sourceJobId: `matching-test-remote-${stamp}`,
        applyUrl: 'https://example.com/apply/1', sourceUrl: 'https://example.com/job/1',
        company: 'MatchTestCo', title: 'Backend Engineer', location: 'Remote',
        remoteType: 'remote', descriptionText: 'Backend role.', contentHash: `hash-1-${stamp}`,
        embedding: vectorA, status: 'active',
      },
      {
        source: 'greenhouse', sourceJobId: `matching-test-onsite-${stamp}`,
        applyUrl: 'https://example.com/apply/2', sourceUrl: 'https://example.com/job/2',
        company: 'MatchTestCo', title: 'Frontend Engineer', location: 'Berlin',
        remoteType: 'onsite', descriptionText: 'Onsite role.', contentHash: `hash-2-${stamp}`,
        embedding: vectorA, status: 'active',
      },
      {
        source: 'greenhouse', sourceJobId: `matching-test-blocked-${stamp}`,
        applyUrl: 'https://example.com/apply/3', sourceUrl: 'https://example.com/job/3',
        company: `MatchTestBlockedCo-${stamp}`, title: 'Backend Engineer', location: 'Remote',
        remoteType: 'remote', descriptionText: 'Blocked company role.', contentHash: `hash-3-${stamp}`,
        embedding: vectorA, status: 'active',
      },
    ]).returning({ id: schema.jobs.id })
    jobIds.push(...insertedJobs.map(j => j.id))
    const [remoteJobId, onsiteJobId, blockedJobId] = jobIds

    const blocked = await blockCompany(`MatchTestBlockedCo-${stamp}`)
    blockedCompanyId = blocked.id

    // ── 1. hard filters ──────────────────────────────────────────────────
    const prefsRemoteOnly = { ...EMPTY_JOB_PREFERENCES, remoteType: ['remote' as const] }
    const blockedSet = new Set([blocked.normalizedName])

    const resultsNoHidden = await retrieveCandidateJobs({
      profileEmbedding: vectorA, preferences: prefsRemoteOnly,
      blockedCompaniesNormalized: blockedSet, hiddenJobIds: new Set(), limit: 10,
    })
    const resultIds = resultsNoHidden.map(r => r.id)
    check('remote-type filter keeps the remote job', resultIds.includes(remoteJobId))
    check('remote-type filter excludes the onsite job', !resultIds.includes(onsiteJobId))
    check('blocked-company filter excludes the blocked company\'s job even though it\'s remote', !resultIds.includes(blockedJobId))

    await hideJobForUser(userA.id, remoteJobId)
    const hiddenForA = await listHiddenJobIds(userA.id)
    const resultsWithHidden = await retrieveCandidateJobs({
      profileEmbedding: vectorA, preferences: prefsRemoteOnly,
      blockedCompaniesNormalized: blockedSet, hiddenJobIds: hiddenForA, limit: 10,
    })
    check('hiding a job excludes it from that user\'s retrieval results', !resultsWithHidden.map(r => r.id).includes(remoteJobId))

    // ── 2. cache invalidation ────────────────────────────────────────────
    const versionT1 = new Date('2026-01-01T00:00:00Z')
    const versionT2 = new Date('2026-02-01T00:00:00Z')
    await upsertMatches(userA.id, versionT1, [{
      jobId: remoteJobId, matchScore: 80, strengths: ['x'], gaps: [], missingKeywords: [], recommendation: 'good fit',
    }])

    const cachedAtT1 = await getCachedMatches(userA.id, [remoteJobId], versionT1)
    check('cached match is returned when the profile version matches exactly', cachedAtT1.has(remoteJobId) && cachedAtT1.get(remoteJobId)!.matchScore === 80)

    const cachedAtT2 = await getCachedMatches(userA.id, [remoteJobId], versionT2)
    check('cached match is NOT returned for a different profile version — treated as invalidated', !cachedAtT2.has(remoteJobId))

    // ── 3. ownership ─────────────────────────────────────────────────────
    await saveJobForUser(userA.id, onsiteJobId)
    const savedA = await listSavedJobIds(userA.id)
    const savedB = await listSavedJobIds(userB.id)
    check('userA sees their own saved job', savedA.has(onsiteJobId))
    check('userB does NOT see userA\'s saved job', !savedB.has(onsiteJobId))

    const hiddenB = await listHiddenJobIds(userB.id)
    check('userB does NOT see userA\'s hidden job', !hiddenB.has(remoteJobId))

    const cachedForB = await getCachedMatches(userB.id, [remoteJobId], versionT1)
    check('userB has no cached match score for userA\'s cached job (scores are per-user)', !cachedForB.has(remoteJobId))
  } finally {
    // Cleanup — deleting the jobs cascades their saved/hidden/match rows;
    // deleting the users cascades anything left (see schema.ts's onDelete).
    if (jobIds.length > 0) {
      for (const id of jobIds) {
        await db.delete(schema.jobs).where(eq(schema.jobs.id, id))
      }
    }
    if (blockedCompanyId) await unblockCompany(blockedCompanyId)
    if (userA) await db.delete(schema.users).where(eq(schema.users.id, userA.id))
    if (userB) await db.delete(schema.users).where(eq(schema.users.id, userB.id))
    console.log('\n(cleaned up test users/jobs/blocked-company)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
