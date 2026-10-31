import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findUserByEmail } from '@/lib/db/users'
import { verifyPassword } from '@/lib/password'
import { createSession, SESSION_COOKIE } from '@/lib/session'
import { checkRateLimit } from '@/lib/rateLimit'

// Higher than signup's limit — a legitimate user mistyping their password a
// few times shouldn't get locked out, but this still bounds brute-force
// attempts against one account.
const RATE_LIMIT = { max: 10, windowSeconds: 15 * 60 }

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const rate = await checkRateLimit(`signin:email:${normalizedEmail}`, RATE_LIMIT.max, RATE_LIMIT.windowSeconds)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const user = await findUserByEmail(normalizedEmail)
    if (!user) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
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
