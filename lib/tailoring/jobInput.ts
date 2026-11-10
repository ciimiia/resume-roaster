/**
 * Resolves the two allowed job-input shapes into one common record for
 * the tailoring pipeline: a job id already in our DB (from the /jobs
 * feed), or pasted text. Deliberately does NOT fetch any URL — per the
 * project rule, the only job data this phase ever reads is either
 * already-ingested rows (which themselves only ever came from the
 * approved ATS adapters, see lib/jobIngestion/) or a user's own paste.
 */
import 'server-only'
import { createHash } from 'crypto'
import { getJobById } from '@/lib/db/jobs'
import { sanitizeJobDescription } from '@/lib/jobIngestion/sanitizeHtml'

export interface ResolvedJobInput {
  jobId: string | null
  jobTextHash: string | null
  title: string
  company: string | null
  descriptionText: string
}

export type ResolveJobInputResult =
  | { ok: true; job: ResolvedJobInput }
  | { ok: false; error: 'JOB_NOT_FOUND' | 'JOB_TEXT_REQUIRED' | 'JOB_TEXT_TOO_SHORT' }

const MIN_PASTED_JOB_TEXT_LENGTH = 40

export async function resolveJobInput(input: { jobId?: string; jobText?: string }): Promise<ResolveJobInputResult> {
  if (input.jobId) {
    const job = await getJobById(input.jobId)
    if (!job) return { ok: false, error: 'JOB_NOT_FOUND' }
    return {
      ok: true,
      job: { jobId: job.id, jobTextHash: null, title: job.title, company: job.company, descriptionText: job.descriptionText },
    }
  }

  const pasted = sanitizeJobDescription(input.jobText)
  if (!input.jobText) return { ok: false, error: 'JOB_TEXT_REQUIRED' }
  if (pasted.length < MIN_PASTED_JOB_TEXT_LENGTH) return { ok: false, error: 'JOB_TEXT_TOO_SHORT' }

  const jobTextHash = createHash('sha256').update(pasted, 'utf8').digest('hex')
  return {
    ok: true,
    // No title/company metadata for a paste — the UI collects a free-text
    // title when the user pastes a job (see app/jobs/tailor/page.tsx), the
    // route falls back to a generic label if none is given.
    job: { jobId: null, jobTextHash, title: 'Pasted job', company: null, descriptionText: pasted },
  }
}
