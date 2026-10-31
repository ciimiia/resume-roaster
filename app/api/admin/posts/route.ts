import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { deleteAiPost } from '@/lib/db/blog'
import { env } from '@/lib/env'

async function guardAdmin() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !env.isAdminEmail(session.email)) return null
  return session
}

export async function DELETE(req: NextRequest) {
  if (!await guardAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  try {
    await deleteAiPost(slug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/posts] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
