import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { env } from '@/lib/env'
import { deleteJobsByCompany, deleteJobsBySource } from '@/lib/db/jobs'

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !env.isAdminEmail(session.email)) return null
  return session
}

/**
 * Deletes jobs by company or by source — a one-off purge, distinct from
 * blocked-companies (which also prevents future re-ingestion) and from
 * disabling a job_sources row (which stops fetching but keeps existing
 * jobs). Exactly one of ?company= or ?source= must be given.
 */
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const company = url.searchParams.get('company')
    const source = url.searchParams.get('source')

    if (!company && !source) {
      return NextResponse.json({ error: 'COMPANY_OR_SOURCE_REQUIRED' }, { status: 400 })
    }
    if (company && source) {
      return NextResponse.json({ error: 'GIVE_ONLY_ONE' }, { status: 400 })
    }

    const removedCount = company ? await deleteJobsByCompany(company) : await deleteJobsBySource(source!)
    return NextResponse.json({ removedCount })
  } catch (err) {
    console.error('[admin/jobs] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
