/**
 * Verifies every candidate board in lib/jobIngestion/seedCandidates.ts
 * actually returns HTTP 200 before inserting it into job_sources — per
 * Phase 2a's requirement, candidates that don't verify are dropped, not
 * seeded with enabled=false as a "maybe later."
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/seedJobSources.ts
 */
import { SEED_CANDIDATES } from '../lib/jobIngestion/seedCandidates'
import { getDb, schema } from '../lib/db'
import { and, eq } from 'drizzle-orm'

function urlFor(atsType: string, boardToken: string): string {
  switch (atsType) {
    case 'greenhouse':
      return `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`
    case 'lever':
      return `https://api.lever.co/v0/postings/${boardToken}?mode=json`
    case 'ashby':
      return `https://api.ashbyhq.com/posting-api/job-board/${boardToken}`
    default:
      throw new Error(`unknown atsType ${atsType}`)
  }
}

async function verify(atsType: string, boardToken: string): Promise<{ ok: boolean; status: number; jobCount: number }> {
  try {
    const res = await fetch(urlFor(atsType, boardToken), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { ok: false, status: res.status, jobCount: 0 }
    const data = await res.json()
    const jobs = Array.isArray(data) ? data : (data.jobs ?? [])
    return { ok: true, status: res.status, jobCount: jobs.length }
  } catch (err) {
    return { ok: false, status: 0, jobCount: 0 }
  }
}

async function main() {
  const db = getDb()
  let verified = 0
  let dropped = 0
  let alreadySeeded = 0
  const droppedList: string[] = []

  for (const candidate of SEED_CANDIDATES) {
    const existing = await db.select().from(schema.jobSources)
      .where(and(eq(schema.jobSources.atsType, candidate.atsType), eq(schema.jobSources.boardToken, candidate.boardToken)))
      .limit(1)
    if (existing.length > 0) {
      alreadySeeded++
      console.log(`SKIP (already seeded) — ${candidate.atsType}:${candidate.boardToken}`)
      continue
    }

    const result = await verify(candidate.atsType, candidate.boardToken)
    if (!result.ok) {
      dropped++
      droppedList.push(`${candidate.atsType}:${candidate.boardToken} (${candidate.companyName}) — HTTP ${result.status}`)
      console.log(`DROP — ${candidate.atsType}:${candidate.boardToken} (${candidate.companyName}) — HTTP ${result.status}`)
      continue
    }

    await db.insert(schema.jobSources).values({
      atsType: candidate.atsType,
      boardToken: candidate.boardToken,
      companyName: candidate.companyName,
      enabled: true,
    })
    verified++
    console.log(`SEEDED — ${candidate.atsType}:${candidate.boardToken} (${candidate.companyName}) — ${result.jobCount} jobs currently live`)

    // Small courtesy delay between verification requests — this is a
    // one-time seed, not the recurring ingestion runner, but no reason to
    // hammer several different companies' boards back to back either.
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n${verified} seeded, ${dropped} dropped, ${alreadySeeded} already present (of ${SEED_CANDIDATES.length} candidates)`)
  if (droppedList.length > 0) {
    console.log('\nDropped candidates:')
    droppedList.forEach(d => console.log(' -', d))
  }
}

main()
