/**
 * Embeds active jobs that are new or whose text changed since their last
 * embedding (see lib/db/jobs.ts's getJobsNeedingEmbedding). Runs inside a
 * single serverless invocation (the `/api/cron/embed-jobs` route), bounded
 * the same way lib/jobIngestion/runner.ts is: a wall-clock time budget and
 * a max-items-per-run cap, so a large backlog clears gradually across
 * multiple cron ticks instead of risking a timeout.
 *
 * Logs never include job title/company/description text — only counts and
 * error types/messages, matching lib/jobIngestion/runner.ts's logging rule.
 */
import { getJobsNeedingEmbedding, setJobEmbedding, buildJobEmbeddingText } from '@/lib/db/jobs'
import { embedTexts } from '@/lib/embeddings'

const DEFAULT_TIME_BUDGET_MS = 45_000
const DEFAULT_MAX_JOBS_PER_RUN = 300
const EMBED_CHUNK_SIZE = 20 // one OpenRouter call per chunk, not one call per job

export interface EmbedRunnerOptions {
  timeBudgetMs?: number
  maxJobs?: number
}

export interface EmbedRunnerResult {
  candidates: number
  embedded: number
  failedChunks: number
}

export async function runJobEmbedding(options: EmbedRunnerOptions = {}): Promise<EmbedRunnerResult> {
  const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS
  const maxJobs = options.maxJobs ?? DEFAULT_MAX_JOBS_PER_RUN
  const startedAt = Date.now()

  const jobs = await getJobsNeedingEmbedding(maxJobs)
  let embedded = 0
  let failedChunks = 0

  for (let i = 0; i < jobs.length; i += EMBED_CHUNK_SIZE) {
    if (Date.now() - startedAt > timeBudgetMs) break

    const chunk = jobs.slice(i, i + EMBED_CHUNK_SIZE)
    const result = await embedTexts(chunk.map(buildJobEmbeddingText))

    if (!result.ok) {
      failedChunks++
      console.error('[jobEmbedding] chunk failed:', result.error)
      continue // one bad chunk doesn't stop the rest of the backlog
    }

    await Promise.all(chunk.map((job, idx) => setJobEmbedding(job.id, result.embeddings[idx], job.contentHash)))
    embedded += chunk.length
  }

  console.log(`[jobEmbedding] candidates=${jobs.length} embedded=${embedded} failedChunks=${failedChunks}`)
  return { candidates: jobs.length, embedded, failedChunks }
}
