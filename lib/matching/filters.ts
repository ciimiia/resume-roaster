/**
 * Hard filters applied before vector retrieval — jobs that fail these never
 * reach the LLM re-rank step at all, regardless of how well they'd score.
 * Vector retrieval (lib/matching/retrieve.ts) does the location/remote/
 * language/company exclusions in SQL (cheap, indexable); seniority is
 * regex-inferred from the title (lib/matching/seniority.ts) and can only
 * be applied in application code after fetching.
 */
import { inferSeniorityFromTitle } from './seniority'
import type { JobPreferences } from '@/lib/resumeProfile'

/** Jobs whose title clearly indicates a different seniority than requested are dropped; an unclassifiable title passes through (see seniority.ts). */
export function filterBySeniority<T extends { title: string }>(jobs: T[], seniority: JobPreferences['seniority']): T[] {
  if (!seniority) return jobs
  return jobs.filter(job => {
    const inferred = inferSeniorityFromTitle(job.title)
    return inferred === null || inferred === seniority
  })
}
