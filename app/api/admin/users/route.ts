import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv } from '@/lib/kv'
import { env } from '@/lib/env'

interface StoredUser { id: string; email: string; createdAt: string }

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !env.isAdminEmail(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const emails = (await kv.get<string[]>('users:all')) ?? []
    const users = (await Promise.all(
      emails.map(e => kv.get<StoredUser>(`user:email:${e}`))
    )).filter((u): u is StoredUser => u !== null)
      .map(u => ({ email: u.email, createdAt: u.createdAt }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[admin/users] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
