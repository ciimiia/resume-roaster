import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { deleteResultForUser } from '@/lib/db/results'

/** Lets the owner delete a shared result link (/r/[id]) — ownership check is the query itself, see lib/db/results.ts's deleteResultForUser. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const deleted = await deleteResultForUser(id, session.userId)
    if (!deleted) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[save/[id]] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
