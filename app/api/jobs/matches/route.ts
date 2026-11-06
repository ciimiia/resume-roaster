import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getJobMatches } from '@/lib/matching/getMatches'
import { checkRateLimit } from '@/lib/rateLimit'

// Throttles how often this (expensive — vector query + possible LLM call)
// endpoint can be hit; separate from and in addition to the per-user daily
// LLM re-rank cap inside getJobMatches itself.
const REQUEST_LIMIT = { max: 20, windowSeconds: 60 }

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rate = await checkRateLimit(`jobs-matches:user:${session.userId}`, REQUEST_LIMIT.max, REQUEST_LIMIT.windowSeconds)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const result = await getJobMatches(session.userId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[jobs/matches] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
