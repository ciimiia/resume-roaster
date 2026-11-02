import { createHash } from 'crypto'
import type { NormalizedJob } from './types'

/**
 * Detects "this exact posting changed" vs. "still present, unchanged" so
 * the ingestion runner can skip a write when nothing meaningful differs,
 * without diffing full records every run. Only the fields a re-post would
 * actually change are included — timestamps and ids are deliberately
 * excluded (those always differ and would make every row look "changed").
 */
export function computeContentHash(job: Pick<NormalizedJob, 'title' | 'company' | 'location' | 'descriptionText'>): string {
  const normalized = [
    job.title.trim().toLowerCase(),
    job.company.trim().toLowerCase(),
    (job.location ?? '').trim().toLowerCase(),
    job.descriptionText.trim().toLowerCase(),
  ].join('\u0000')
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}
