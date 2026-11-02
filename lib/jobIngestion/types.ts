/**
 * Shared types for the job-ingestion pipeline (Phase 2a). An adapter's job
 * is purely: fetch a source's public endpoint, normalize its response into
 * this shape. Nothing here talks to the database — that's lib/db/jobs.ts
 * and lib/jobIngestion/runner.ts.
 */

export type JobSourceId = 'greenhouse' | 'lever' | 'ashby' | 'remotive' | 'arbeitnow' | 'adzuna'

export interface NormalizedJob {
  source: JobSourceId
  sourceJobId: string
  /** The underlying ATS a job ultimately lives on, when the source itself is an aggregator (e.g. Adzuna pointing at a Greenhouse-hosted posting). Null when the source IS the ATS. */
  atsType: string | null
  applyUrl: string
  sourceUrl: string
  attributionLabel: string | null
  company: string
  title: string
  location: string | null
  remoteType: 'remote' | 'hybrid' | 'onsite' | null
  /** Already sanitized plain text — see lib/jobIngestion/sanitizeHtml.ts. Adapters must run raw HTML through that before returning. */
  descriptionText: string
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPredicted: boolean
  postedAt: Date | null
  language: string | null
}

export interface JobSourceConfig {
  id: string
  atsType: JobSourceId
  /** Company board slug for per-company ATS adapters; null for aggregator-wide sources. */
  boardToken: string | null
  companyName: string
}

export interface FetchResult {
  jobs: NormalizedJob[]
}

/**
 * One adapter per source. `fetchJobs` takes the job_sources row it's
 * fetching for and returns normalized jobs — it must never throw for
 * "no jobs found" (return an empty array), only for a genuine fetch/parse
 * failure, so the ingestion runner's per-source error isolation (see
 * lib/jobIngestion/runner.ts) can tell the two apart.
 */
export interface JobSourceAdapter {
  id: JobSourceId
  fetchJobs(config: JobSourceConfig): Promise<FetchResult>
}
