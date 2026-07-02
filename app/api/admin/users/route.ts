import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv } from '@/lib/kv'

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

interface StoredUser { id: string; email: string; createdAt: string }

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const emails = (await kv.get<string[]>('users:all')) ?? []
  const users = (await Promise.all(
    emails.map(e => kv.get<StoredUser>(`user:email:${e}`))
  )).filter((u): u is StoredUser => u !== null)
    .map(u => ({ email: u.email, createdAt: u.createdAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({ users })
}
