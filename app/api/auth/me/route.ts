import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { env } from '@/lib/env'

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ user: null })

  const session = await verifySession(token)
  if (!session) return NextResponse.json({ user: null })

  const isAdmin = env.isAdminEmail(session.email)
  return NextResponse.json({ user: { userId: session.userId, email: session.email, isAdmin } })
}
