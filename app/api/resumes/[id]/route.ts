import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getResumeForUser, deleteResumeForUser } from '@/lib/db/resumes'
import { vercelBlobStorage } from '@/lib/storage'

async function requireSession() {
  const token = cookies().get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Ownership check is the query itself — getResumeForUser only returns a
    // row if BOTH the id matches AND it belongs to this user. A resume that
    // exists but belongs to someone else returns null here, same as one
    // that doesn't exist at all — never leaks "it exists but isn't yours".
    const resume = await getResumeForUser(params.id, session.userId)
    if (!resume) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    return NextResponse.json({ resume })
  } catch (err) {
    console.error('[resumes/[id]] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const filePathname = await deleteResumeForUser(params.id, session.userId)
    if (!filePathname) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    try {
      await vercelBlobStorage.delete(filePathname)
    } catch (err) {
      // DB row is already gone — log but don't fail the request over an
      // orphaned blob; it's not reachable without the DB row anyway (no
      // route resolves a pathname to a file without an ownership-checked
      // DB lookup first).
      console.error('[resumes/[id]] DELETE: failed to delete blob file:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[resumes/[id]] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
