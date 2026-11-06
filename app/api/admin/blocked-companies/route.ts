import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { env } from '@/lib/env'
import { listBlockedCompanies, blockCompany, unblockCompany } from '@/lib/db/blockedCompanies'
import { deleteJobsByCompany } from '@/lib/db/jobs'

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
    const companies = await listBlockedCompanies()
    return NextResponse.json({ companies })
  } catch (err) {
    console.error('[admin/blocked-companies] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

// Blocks a company (future ingestion skips it — see
// lib/jobIngestion/runner.ts) and purges jobs already ingested from it in
// the same call, so blocking actually removes it from view immediately
// rather than just preventing new listings.
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { companyName?: string; reason?: string }
    if (!body.companyName || typeof body.companyName !== 'string' || body.companyName.trim().length === 0) {
      return NextResponse.json({ error: 'COMPANY_NAME_REQUIRED' }, { status: 400 })
    }

    const blocked = await blockCompany(body.companyName.trim(), body.reason?.trim())
    const removedJobCount = await deleteJobsByCompany(body.companyName.trim())
    return NextResponse.json({ blocked, removedJobCount })
  } catch (err) {
    console.error('[admin/blocked-companies] POST failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })

    await unblockCompany(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/blocked-companies] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
