import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { kv } from '@/lib/kv'
import { verifyPassword } from '@/lib/password'
import { createSession, SESSION_COOKIE } from '@/lib/session'

interface StoredUser {
  id: string
  email: string
  passwordHash: string
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string }

  const normalizedEmail = email.trim().toLowerCase()

  const user = await kv.get<StoredUser>(`user:email:${normalizedEmail}`)
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
}
