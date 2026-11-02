import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getSiteContent, setSiteContent } from '@/lib/db/siteSettings'
import { env } from '@/lib/env'
import type { SiteContent } from '@/lib/SiteContentContext'

async function guard() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !env.isAdminEmail(session.email)) return null
  return session
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const content = await getSiteContent()
    return NextResponse.json({ content })
  } catch (err) {
    console.error('[admin/site-content] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as SiteContent
  try {
    await setSiteContent(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/site-content] POST failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function DELETE() {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await setSiteContent({})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/site-content] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
