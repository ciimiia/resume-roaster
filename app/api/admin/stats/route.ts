import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getStats } from '@/lib/db/stats'
import { env } from '@/lib/env'

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !env.isAdminEmail(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[admin/stats] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
