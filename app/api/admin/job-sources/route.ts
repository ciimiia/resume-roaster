import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { env } from '@/lib/env'
import { listAllJobSources, setJobSourceEnabled } from '@/lib/db/jobSources'
import { countActiveJobsBySource } from '@/lib/db/jobs'
import { runIngestion } from '@/lib/jobIngestion/runner'

// Manual-trigger runs are expensive (real outbound HTTP to every source) —
// kept well under the cron's own budget so an admin mashing the button
// can't run multiple full passes back to back.
export const maxDuration = 60

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !env.isAdminEmail(session.email)) return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [sources, counts] = await Promise.all([listAllJobSources(), countActiveJobsBySource()])
    const countBySource = new Map(counts.map(c => [c.source, c.activeCount]))

    return NextResponse.json({
      sources: sources.map(s => ({
        ...s,
        activeJobCount: countBySource.get(s.atsType) ?? 0,
      })),
    })
  } catch (err) {
    console.error('[admin/job-sources] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

// Disable a company's board without deleting its history/jobs — the
// "disable a company" admin action distinct from blocked-companies' full
// block-and-purge (lib/db/blockedCompanies.ts). A disabled source is
// simply skipped by the next ingestion run; its existing jobs stay until
// they naturally expire.
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { id?: string; enabled?: boolean }
    if (!body.id || typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'ID_AND_ENABLED_REQUIRED' }, { status: 400 })
    }

    await setJobSourceEnabled(body.id, body.enabled)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/job-sources] PATCH failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

// Manually trigger one ingestion pass — same runner the cron route uses,
// just admin-session-gated instead of CRON_SECRET-gated.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runIngestion()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[admin/job-sources] POST (manual run) failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
