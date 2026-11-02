import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { jobExists } from '@/lib/db/jobs'
import { saveJobForUser, unsaveJobForUser } from '@/lib/db/savedJobs'

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await jobExists(id))) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    await saveJobForUser(session.userId, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[jobs/[id]/save] POST failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    // Save/unsave are ownership-scoped by construction — both only ever
    // act on (session.userId, id), so there's no cross-user row to touch
    // even if `id` belongs to someone else's saved-jobs state.
    await unsaveJobForUser(session.userId, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[jobs/[id]/save] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
