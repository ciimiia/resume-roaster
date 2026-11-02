import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { searchJobs } from '@/lib/db/jobs'
import { checkRateLimit } from '@/lib/rateLimit'

const SEARCH_LIMIT = { max: 60, windowSeconds: 60 }
const MAX_PAGE_SIZE = 50
const REMOTE_TYPES = new Set(['remote', 'hybrid', 'onsite'])

export async function GET(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rate = await checkRateLimit(`jobs-search:user:${session.userId}`, SEARCH_LIMIT.max, SEARCH_LIMIT.windowSeconds)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const url = new URL(req.url)
    const q = url.searchParams.get('q') ?? undefined
    const remoteRaw = url.searchParams.get('remote') ?? undefined
    const remote = remoteRaw && REMOTE_TYPES.has(remoteRaw) ? (remoteRaw as 'remote' | 'hybrid' | 'onsite') : undefined
    const country = url.searchParams.get('country') ?? undefined
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize') ?? '20') || 20))

    const result = await searchJobs({ q, remote, country, page, pageSize })
    return NextResponse.json({ ...result, page, pageSize })
  } catch (err) {
    console.error('[jobs] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
