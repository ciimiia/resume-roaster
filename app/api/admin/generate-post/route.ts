import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { env } from '@/lib/env'
import { checkRateLimit } from '@/lib/rateLimit'

// Admin-only, but still rate-limited — this calls a paid AI model, and
// "every route that calls a paid API" (launch-readiness security pass)
// shouldn't have an unconditional exception just because the caller is
// trusted; it costs money per call regardless of who triggers it.
const LIMIT = { max: 5, windowSeconds: 60 * 60 }

// Proxy for admin users — calls the cron endpoint with the real CRON_SECRET server-side
export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !env.isAdminEmail(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rate = await checkRateLimit(`admin-generate-post:${session.userId}`, LIMIT.max, LIMIT.windowSeconds)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  const secret = env.cronSecret
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })

  const base = req.nextUrl.origin
  const res = await fetch(`${base}/api/cron/generate-post`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
