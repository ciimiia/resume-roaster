import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findUserByEmail } from '@/lib/db/users'
import { verifyPassword } from '@/lib/password'
import { createSession, SESSION_COOKIE } from '@/lib/session'
import { peekRateLimit, recordFailure, checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'

// Email-scoped: counts ONLY failed attempts, short window. Counting every
// attempt (including the legitimate correct one) would let an attacker lock
// a victim out of their own account just by submitting a few wrong
// passwords for the victim's email — a correct signin must never be
// blocked by someone else's prior failures against the same address.
// Short window + only-failures still bounds brute-force guessing without
// that abuse vector.
const EMAIL_LIMIT = { max: 5, windowSeconds: 10 * 60 }

// IP-scoped: volumetric, counts every call (success or failure) — this one
// CAN block a legitimate request if the same IP is making a lot of them,
// which is the point (catches one source hammering many different emails,
// which the email-scoped limit above wouldn't).
const IP_LIMIT = { max: 20, windowSeconds: 15 * 60 }

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string }

  const normalizedEmail = email.trim().toLowerCase()
  const emailKey = `signin:email:${normalizedEmail}`
  const ipKey = `signin:ip:${getClientIp(req)}`

  try {
    const [emailRate, ipRate] = await Promise.all([
      peekRateLimit(emailKey, EMAIL_LIMIT.max, EMAIL_LIMIT.windowSeconds),
      checkRateLimit(ipKey, IP_LIMIT.max, IP_LIMIT.windowSeconds),
    ])
    if (!emailRate.allowed || !ipRate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const user = await findUserByEmail(normalizedEmail)
    if (!user) {
      await recordFailure(emailKey, EMAIL_LIMIT.windowSeconds)
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      await recordFailure(emailKey, EMAIL_LIMIT.windowSeconds)
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    const token = await createSession(user.id, normalizedEmail)
    cookies().set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return NextResponse.json({ ok: true, email: normalizedEmail })
  } catch (err) {
    console.error('[auth/signin] failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
