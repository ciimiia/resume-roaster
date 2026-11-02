/**
 * Orchestrates one ingestion pass: pulls enabled job_sources, fetches each
 * through its adapter, upserts normalized jobs, and marks stale jobs
 * expired. Designed to run inside a single serverless invocation (the
 * `/api/cron/ingest-jobs` route) without exceeding the function's time
 * limit:
 *
 *  - processes sources ordered oldest-fetched-first (see
 *    lib/db/jobSources.ts), so a full catalog refresh happens gradually
 *    across multiple cron ticks rather than in one shot
 *  - stops picking up new sources once the wall-clock budget is spent,
 *    even mid-list — whatever didn't get processed this tick is simply
 *    oldest-fetched next time
 *  - one source's failure (bad HTTP status, timeout, malformed response)
 *    is caught and recorded on that source only — it never aborts the
 *    whole run (see the try/catch per source below)
 *  - a short delay between sources is a minimum courtesy; retries use
 *    exponential backoff and only for transient-looking failures
 *
 * Logs deliberately never include job description text or any other
 * job-body content — only counts, source ids, and short error strings.
 */
import { listEnabledJobSources, recordFetchSuccess, recordFetchError } from '@/lib/db/jobSources'
import { upsertJobsBatch, expireStaleJobs } from '@/lib/db/jobs'
import { getBlockedCompanyNormalizedSet, normalizeCompanyName } from '@/lib/db/blockedCompanies'
import { ADAPTERS } from './adapters'
import type { JobSourceId } from './types'

const DEFAULT_TIME_BUDGET_MS = 45_000
const DEFAULT_MAX_SOURCES_PER_RUN = 15
const INTER_SOURCE_DELAY_MS = 300
const EXPIRE_AFTER_DAYS = 14
const MAX_RETRIES = 2

export interface RunnerOptions {
  timeBudgetMs?: number
  maxSources?: number
}

export interface SourceRunResult {
  sourceId: string
  companyName: string
  atsType: JobSourceId
  ok: boolean
  jobCount: number
  newCount: number
  error?: string
}

export interface RunnerResult {
  processedSources: number
  skippedSources: number
  totalJobs: number
  newJobs: number
  expiredJobs: number
  perSource: SourceRunResult[]
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return /HTTP (429|50\d)/.test(message) || /timeout|abort/i.test(message)
}

async function fetchWithRetry(atsType: JobSourceId, config: Parameters<typeof ADAPTERS[JobSourceId]['fetchJobs']>[0]) {
  let attempt = 0
  let lastErr: unknown
  while (attempt <= MAX_RETRIES) {
    try {
      return await ADAPTERS[atsType].fetchJobs(config)
    } catch (err) {
      lastErr = err
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err
      await sleep(500 * 2 ** attempt) // 500ms, 1s, 2s
      attempt++
    }
  }
  throw lastErr
}

export async function runIngestion(options: RunnerOptions = {}): Promise<RunnerResult> {
  const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS
  const maxSources = options.maxSources ?? DEFAULT_MAX_SOURCES_PER_RUN
  const startedAt = Date.now()

  const sources = await listEnabledJobSources()
  const blockedCompanies = await getBlockedCompanyNormalizedSet()
  const perSource: SourceRunResult[] = []
  let totalJobs = 0
  let newJobs = 0
  let processed = 0

  for (const source of sources) {
    if (processed >= maxSources) break
    if (Date.now() - startedAt > timeBudgetMs) break

    processed++
    try {
      const { jobs: fetchedJobs } = await fetchWithRetry(source.atsType, {
        id: source.id,
        atsType: source.atsType,
        boardToken: source.boardToken,
        companyName: source.companyName,
      })

      // Admin-blocked companies (lib/db/blockedCompanies.ts) are dropped
      // before they ever reach the database — covers both per-company
      // boards and aggregator sources (Adzuna etc.) that might return a
      // blocked employer's listing alongside others.
      const jobs = fetchedJobs.filter(j => !blockedCompanies.has(normalizeCompanyName(j.company)))

      // Bulk upsert, not one round trip per job — a single large company
      // board (hundreds of jobs) upserted one row at a time measured
      // eating the entire run's time budget by itself. See
      // lib/db/jobs.ts's upsertJobsBatch comment.
      const { newCount } = await upsertJobsBatch(jobs)

      await recordFetchSuccess(source.id)
      totalJobs += jobs.length
      newJobs += newCount
      perSource.push({
        sourceId: source.id, companyName: source.companyName, atsType: source.atsType,
        ok: true, jobCount: jobs.length, newCount,
      })
      console.log(`[jobIngestion] ${source.atsType}:${source.companyName} — ${jobs.length} jobs (${newCount} new)`)
    } catch (err) {
      // Per-source error isolation — this source's failure is recorded and
      // the run continues to the next source.
      const message = err instanceof Error ? err.message : String(err)
      await recordFetchError(source.id, message)
      perSource.push({
        sourceId: source.id, companyName: source.companyName, atsType: source.atsType,
        ok: false, jobCount: 0, newCount: 0, error: message,
      })
      console.error(`[jobIngestion] ${source.atsType}:${source.companyName} failed:`, message)
    }

    if (processed < sources.length) await sleep(INTER_SOURCE_DELAY_MS)
  }

  const expiredJobs = await expireStaleJobs(EXPIRE_AFTER_DAYS)

  return {
    processedSources: processed,
    skippedSources: sources.length - processed,
    totalJobs,
    newJobs,
    expiredJobs,
    perSource,
  }
}
