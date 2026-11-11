import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getTailoredResumeForUser, updateTailoredResumeForUser } from '@/lib/db/tailoredResumes'
import { TailoredProfileSchema } from '@/lib/tailoring/types'
import { runFabricationGuard, sanitizeTailoredProfile } from '@/lib/tailoring/guard'
import { checkAtsCoverage } from '@/lib/tailoring/ats'
import { getProfileForUser } from '@/lib/db/profiles'
import { getJobById } from '@/lib/db/jobs'

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  // Ownership check is the query itself — see app/api/resumes/[id]/route.ts's comment.
  const record = await getTailoredResumeForUser(id, session.userId)
  if (!record) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  return NextResponse.json({ tailoredResume: record })
}

/**
 * Lets the user edit the tailored content directly (e.g. after reviewing
 * flagged items) — re-validates the shape, re-runs the anti-fabrication
 * guard and ATS check against the CURRENT approved profile before saving,
 * so an edit can't be used to slip a fabricated claim past the guard: the
 * guard runs on whatever is saved, not just on the original LLM output.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await getTailoredResumeForUser(id, session.userId)
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    const body = await req.json() as { tailoredProfile: unknown }
    const validated = TailoredProfileSchema.safeParse(body.tailoredProfile)
    if (!validated.success) {
      return NextResponse.json({ error: 'INVALID_PROFILE', issues: validated.error.issues.map(i => i.path.join('.')) }, { status: 400 })
    }

    const profile = await getProfileForUser(session.userId)
    if (!profile) return NextResponse.json({ error: 'PROFILE_NOT_APPROVED' }, { status: 409 })

    const flags = runFabricationGuard(profile, validated.data)
    const sanitized = sanitizeTailoredProfile(validated.data, flags)

    const jobText = existing.jobId ? (await getJobById(existing.jobId))?.descriptionText ?? '' : ''
    const atsCoverage = checkAtsCoverage(sanitized, jobText)

    const updated = await updateTailoredResumeForUser(id, session.userId, { tailoredProfile: sanitized, flags, atsCoverage })
    if (!updated) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    return NextResponse.json({ tailoredResume: updated })
  } catch (err) {
    console.error('[tailor/[id]] PUT failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
