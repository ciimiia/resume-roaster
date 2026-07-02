import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { kv } from '@/lib/kv'
import { hashPassword } from '@/lib/password'
import { createSession, SESSION_COOKIE } from '@/lib/session'

interface StoredUser {
  id: string
  email: string
  passwordHash: string
  createdAt: string
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string }

  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'PASSWORD_WEAK' }, { status: 400 })
  }

  const existing = await kv.get<StoredUser>(`user:email:${normalizedEmail}`)
  if (existing) {
    return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 })
  }

  const id           = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const user: StoredUser = { id, email: normalizedEmail, passwordHash, createdAt: new Date().toISOString() }

  await kv.set(`user:email:${normalizedEmail}`, user)
  await kv.set(`user:id:${id}`, user)

  // Maintain global user list for admin panel
  const allEmails = (await kv.get<string[]>('users:all')) ?? []
  if (!allEmails.includes(normalizedEmail)) {
    await kv.set('users:all', [normalizedEmail, ...allEmails])
  }

  const token = await createSession(id, normalizedEmail)
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return NextResponse.json({ ok: true, email: normalizedEmail })
}
