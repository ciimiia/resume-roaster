import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'
import { requestPasswordReset } from '@/lib/passwordReset'

// Same volumetric-throttling reasoning as app/api/auth/signup/route.ts —
// email-scoped stops spamming one address with reset emails, IP-scoped
// catches one source hammering the endpoint across many addresses.
const EMAIL_LIMIT = { max: 3, windowSeconds: 60 * 60 }
const IP_LIMIT = { max: 10, windowSeconds: 60 * 60 }

export async function POST(req: NextRequest) {
  // Feature is hidden entirely when unconfigured, not shown in a broken
  // state — see lib/passwordReset.ts's top comment.
  if (!env.hasEmailProvider) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  try {
    const { email } = await req.json() as { email?: string }
    const normalizedEmail = (email ?? '').trim().toLowerCase()
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const [emailRate, ipRate] = await Promise.all([
      checkRateLimit(`forgotpw:email:${normalizedEmail}`, EMAIL_LIMIT.max, EMAIL_LIMIT.windowSeconds),
      checkRateLimit(`forgotpw:ip:${ip}`, IP_LIMIT.max, IP_LIMIT.windowSeconds),
    ])
    if (!emailRate.allowed || !ipRate.allowed) {
      // Still the generic shape — a 429 here would itself leak "this IP
      // hammered the endpoint", not anything about which emails exist,
      // so it's fine to be explicit about rate limiting specifically.
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    // No enumeration: always the same {ok: true}, whether or not the
    // email matched an account — see lib/passwordReset.ts.
    await requestPasswordReset(normalizedEmail)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/forgot-password] failed:', err)
    // Still {ok: true} — an unexpected error here must not become a way
    // to distinguish "valid email, server broke" from "invalid email".
    return NextResponse.json({ ok: true })
  }
}
