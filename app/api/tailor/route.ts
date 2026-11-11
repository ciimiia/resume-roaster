import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getProfileForUser } from '@/lib/db/profiles'
import { checkRateLimit } from '@/lib/rateLimit'
import { TAILOR_MINUTE_LIMIT, TAILOR_DAILY_LIMIT } from '@/lib/tailoring/caps'
import { runTailoring } from '@/lib/tailoring/runTailoring'
import { listTailoredResumesForUser } from '@/lib/db/tailoredResumes'
import { readJsonWithLimit } from '@/lib/requestSize'

const MAX_BODY_BYTES = 64 * 1024 // generous for a pasted job posting, well short of abuse

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await listTailoredResumesForUser(session.userId)
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[tailor] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [minuteRate, dailyRate] = await Promise.all([
      checkRateLimit(`tailor:minute:${session.userId}`, TAILOR_MINUTE_LIMIT.max, TAILOR_MINUTE_LIMIT.windowSeconds),
      checkRateLimit(`tailor:day:${session.userId}`, TAILOR_DAILY_LIMIT.max, TAILOR_DAILY_LIMIT.windowSeconds),
    ])
    if (!minuteRate.allowed || !dailyRate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const profile = await getProfileForUser(session.userId)
    if (!profile || !profile.approved || !profile.approvedAt) {
      return NextResponse.json({ error: 'PROFILE_NOT_APPROVED' }, { status: 409 })
    }

    const parsed = await readJsonWithLimit<{ jobId?: string; jobText?: string }>(req, MAX_BODY_BYTES)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.error === 'TOO_LARGE' ? 413 : 400 })
    }
    const body = parsed.data
    const result = await runTailoring({
      userId: session.userId,
      profile,
      profileApprovedAt: new Date(profile.approvedAt),
      jobId: body.jobId,
      jobText: body.jobText,
    })

    if (!result.ok) {
      const status = result.error === 'JOB_NOT_FOUND' ? 404
        : result.error === 'JOB_TEXT_REQUIRED' || result.error === 'JOB_TEXT_TOO_SHORT' ? 400
        : 502
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ tailoredResume: result.record })
  } catch (err) {
    console.error('[tailor] POST failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
