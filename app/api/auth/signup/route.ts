import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findUserByEmail, createUser } from '@/lib/db/users'
import { hashPassword } from '@/lib/password'
import { createSession, SESSION_COOKIE } from '@/lib/session'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'

// Volumetric throttling, not credential-guessing protection — every call
// counts, success or failure. Email-scoped stops spamming one address with
// signup attempts; IP-scoped catches one source hammering the endpoint
// (e.g. with many different emails) that the email-scoped limit wouldn't.
const EMAIL_LIMIT = { max: 5, windowSeconds: 15 * 60 }
const IP_LIMIT = { max: 20, windowSeconds: 15 * 60 }

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string }

  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'PASSWORD_WEAK' }, { status: 400 })
  }

  try {
    const ip = getClientIp(req)
    const [emailRate, ipRate] = await Promise.all([
      checkRateLimit(`signup:email:${normalizedEmail}`, EMAIL_LIMIT.max, EMAIL_LIMIT.windowSeconds),
      checkRateLimit(`signup:ip:${ip}`, IP_LIMIT.max, IP_LIMIT.windowSeconds),
    ])
    if (!emailRate.allowed || !ipRate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const existing = await findUserByEmail(normalizedEmail)
    if (existing) {
      return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    let user
    try {
      user = await createUser(normalizedEmail, passwordHash)
    } catch (err) {
      // Unique-violation (two concurrent signups for the same email racing
      // past the findUserByEmail check above) — the DB constraint is the
      // real source of truth, this is just a clean error for that race.
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 })
      }
      throw err
    }

    const token = await createSession(user.id, normalizedEmail);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return NextResponse.json({ ok: true, email: normalizedEmail })
  } catch (err) {
    console.error('[auth/signup] failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
