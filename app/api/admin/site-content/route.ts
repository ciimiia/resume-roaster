import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv } from '@/lib/kv'
import type { SiteContent } from '@/lib/SiteContentContext'

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

async function guard() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !isAdmin(session.email)) return null
  return session
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const content = await kv.get<SiteContent>('site:content')
  return NextResponse.json({ content: content ?? {} })
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as SiteContent
  await kv.set('site:content', body)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await kv.set('site:content', {})
  return NextResponse.json({ ok: true })
}
