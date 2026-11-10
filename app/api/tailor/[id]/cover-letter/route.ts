import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getTailoredResumeForUser } from '@/lib/db/tailoredResumes'
import { saveTailoredCoverLetter } from '@/lib/db/coverLetters'
import { getJobById } from '@/lib/db/jobs'
import { generateTailoredCoverLetter } from '@/lib/tailoring/coverLetter'
import { runFabricationGuardOnText } from '@/lib/tailoring/guard'
import { getProfileForUser } from '@/lib/db/profiles'
import { checkRateLimit } from '@/lib/rateLimit'
import { COVER_LETTER_MINUTE_LIMIT, COVER_LETTER_DAILY_LIMIT } from '@/lib/tailoring/caps'

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tailored = await getTailoredResumeForUser(id, session.userId)
  if (!tailored) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    const [minuteRate, dailyRate] = await Promise.all([
      checkRateLimit(`coverletter:minute:${session.userId}`, COVER_LETTER_MINUTE_LIMIT.max, COVER_LETTER_MINUTE_LIMIT.windowSeconds),
      checkRateLimit(`coverletter:day:${session.userId}`, COVER_LETTER_DAILY_LIMIT.max, COVER_LETTER_DAILY_LIMIT.windowSeconds),
    ])
    if (!minuteRate.allowed || !dailyRate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    // Job text for grounding: from our DB if this tailoring was done
    // against a jobId, otherwise unavailable (pasted job text isn't
    // retained past the original tailoring call — see the Phase 4
    // report's known gaps) — the letter is still grounded in the
    // tailored resume either way, just without the original posting text
    // to reference directly in that case.
    const jobText = tailored.jobId ? (await getJobById(tailored.jobId))?.descriptionText ?? '' : ''

    const result = await generateTailoredCoverLetter(tailored.tailoredProfile, jobText)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    const profile = await getProfileForUser(session.userId)
    const flags = profile ? runFabricationGuardOnText(profile, result.letter) : []

    const savedId = await saveTailoredCoverLetter(session.userId, result.letter, {
      tailoredResumeId: tailored.id, jobId: tailored.jobId, flags,
    })

    return NextResponse.json({ id: savedId, letter: result.letter, flags })
  } catch (err) {
    console.error('[tailor/[id]/cover-letter] POST failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
