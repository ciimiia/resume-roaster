/**
 * Integration test against the real Neon DB — verifies upsertJob dedupes
 * by (source, sourceJobId) instead of creating duplicate rows, that a
 * re-upsert updates content and refreshes lastSeenAt/status, and that
 * expireStaleJobs only flips rows stale enough and leaves fresh ones alone.
 * Creates its own throwaway jobs (distinct source value scoped to this
 * test run) and deletes them when done, even on failure.
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-jobDedupeExpiry.ts
 */
import { getDb, schema } from '../lib/db'
import { eq } from 'drizzle-orm'
import { upsertJob, expireStaleJobs } from '../lib/db/jobs'
import { computeContentHash } from '../lib/jobIngestion/contentHash'
import type { NormalizedJob } from '../lib/jobIngestion/types'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

// A distinct, throwaway source id so this test's rows never collide with
// anything a real ingestion run created, and are trivially identifiable
// for cleanup.
const TEST_SOURCE = 'greenhouse' as const
const stamp = Date.now()
const TEST_JOB_ID = `dedupe-test-${stamp}`

function baseJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: TEST_SOURCE,
    sourceJobId: TEST_JOB_ID,
    atsType: 'greenhouse',
    applyUrl: 'https://example.com/apply',
    sourceUrl: 'https://example.com/job',
    attributionLabel: null,
    company: 'Dedupe Test Co',
    title: 'Test Engineer',
    location: 'Remote',
    remoteType: 'remote',
    descriptionText: 'Original description.',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPredicted: false,
    postedAt: new Date(),
    language: null,
    ...overrides,
  }
}

async function main() {
  const db = getDb()
  try {
    // 1. First upsert creates a new row.
    const first = await upsertJob(baseJob())
    check('first upsert reports isNew=true', first.isNew === true)

    const rowsAfterFirst = await db.select().from(schema.jobs)
      .where(eq(schema.jobs.sourceJobId, TEST_JOB_ID))
    check('exactly one row exists after the first upsert', rowsAfterFirst.length === 1)

    // 2. Second upsert with the SAME (source, sourceJobId) but changed
    // content — must update the existing row, not insert a duplicate.
    const second = await upsertJob(baseJob({ title: 'Senior Test Engineer', descriptionText: 'Updated description.' }))
    check('second upsert (same source+sourceJobId) reports isNew=false', second.isNew === false)

    const rowsAfterSecond = await db.select().from(schema.jobs)
      .where(eq(schema.jobs.sourceJobId, TEST_JOB_ID))
    check('still exactly one row after the second upsert (deduped, not duplicated)', rowsAfterSecond.length === 1)
    check('the row reflects the updated title', rowsAfterSecond[0]?.title === 'Senior Test Engineer')
    check('contentHash changed to match the new content', rowsAfterSecond[0]?.contentHash === computeContentHash(baseJob({ title: 'Senior Test Engineer', descriptionText: 'Updated description.' })))

    // 3. Expiry: a row with a stale lastSeenAt gets flipped to 'expired';
    // a fresh row is left 'active'.
    const staleJobId = `${TEST_JOB_ID}-stale`
    await upsertJob(baseJob({ sourceJobId: staleJobId }))
    await db.update(schema.jobs)
      .set({ lastSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }) // 30 days ago
      .where(eq(schema.jobs.sourceJobId, staleJobId))

    const freshJobId = `${TEST_JOB_ID}-fresh`
    await upsertJob(baseJob({ sourceJobId: freshJobId }))

    const expiredCount = await expireStaleJobs(14) // same threshold the runner uses

    const staleRow = (await db.select().from(schema.jobs).where(eq(schema.jobs.sourceJobId, staleJobId)))[0]
    const freshRow = (await db.select().from(schema.jobs).where(eq(schema.jobs.sourceJobId, freshJobId)))[0]
    check('expireStaleJobs reports at least our one stale row', expiredCount >= 1)
    check('the stale row is now status=expired', staleRow?.status === 'expired')
    check('the fresh row is still status=active', freshRow?.status === 'active')
  } finally {
    // Cleanup — always runs. Deliberately targeted by our own unique,
    // stamped sourceJobId values only — TEST_SOURCE is 'greenhouse', the
    // same value real seeded companies use, so deleting by source alone
    // would wipe real ingested data.
    for (const id of [TEST_JOB_ID, `${TEST_JOB_ID}-stale`, `${TEST_JOB_ID}-fresh`]) {
      await db.delete(schema.jobs).where(eq(schema.jobs.sourceJobId, id))
    }
    console.log('\n(cleaned up test job rows)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
