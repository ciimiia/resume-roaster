import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv } from '@/lib/kv'

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

async function guardAdmin() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !isAdmin(session.email)) return null
  return session
}

export async function DELETE(req: NextRequest) {
  if (!await guardAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  await kv.set('blog:posts:all',
    ((await kv.get<string[]>('blog:posts:all')) ?? []).filter(s => s !== slug)
  )
  // Overwrite with null marker — KV has no delete, so we set empty tombstone
  await kv.set(`blog:post:${slug}`, null)

  return NextResponse.json({ ok: true })
}
