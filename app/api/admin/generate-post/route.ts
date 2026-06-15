import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

// Proxy for admin users — calls the cron endpoint with the real CRON_SECRET server-side
export async function POST(req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !isAdminEmail(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })

  const base = req.nextUrl.origin
  const res = await fetch(`${base}/api/cron/generate-post`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
