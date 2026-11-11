/**
 * Orchestrates one "tailor my resume" request: resolve the job input,
 * call the LLM, validate + run the anti-fabrication guard, check ATS
 * coverage, save. Used by app/api/tailor/route.ts — pulled out of the
 * route so it's directly unit-testable without constructing a NextRequest.
 */
import 'server-only'
import type { ParsedProfile } from '@/lib/resumeProfile'
import { resolveJobInput } from './jobInput'
import { tailorProfile } from './tailor'
import { runFabricationGuard, sanitizeTailoredProfile } from './guard'
import { checkAtsCoverage } from './ats'
import { createTailoredResume, type TailoredResumeRecord } from '@/lib/db/tailoredResumes'

export type RunTailoringResult =
  | { ok: true; record: TailoredResumeRecord }
  | { ok: false; error: 'JOB_NOT_FOUND' | 'JOB_TEXT_REQUIRED' | 'JOB_TEXT_TOO_SHORT' | 'NO_API_KEY' | 'API_ERROR' | 'INVALID_RESPONSE' }

export async function runTailoring(opts: {
  userId: string
  profile: ParsedProfile
  profileApprovedAt: Date
  jobId?: string
  jobText?: string
}): Promise<RunTailoringResult> {
  const jobResult = await resolveJobInput({ jobId: opts.jobId, jobText: opts.jobText })
  if (!jobResult.ok) return { ok: false, error: jobResult.error }
  const job = jobResult.job

  const tailorResult = await tailorProfile(opts.profile, job.descriptionText)
  if (!tailorResult.ok) return { ok: false, error: tailorResult.error }

  const flags = runFabricationGuard(opts.profile, tailorResult.result.tailoredProfile)
  const sanitized = sanitizeTailoredProfile(tailorResult.result.tailoredProfile, flags)
  const atsCoverage = checkAtsCoverage(sanitized, job.descriptionText)

  const record = await createTailoredResume({
    userId: opts.userId,
    jobId: job.jobId,
    jobTextHash: job.jobTextHash,
    jobTitleSnapshot: job.title,
    companySnapshot: job.company,
    profileApprovedAt: opts.profileApprovedAt,
    tailoredProfile: sanitized,
    changes: tailorResult.result.changes,
    flags,
    atsCoverage,
  })

  return { ok: true, record }
}
