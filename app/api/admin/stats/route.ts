import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv } from '@/lib/kv'

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

function dateStr(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = dateStr(0)

  // Fetch last 7 days totals
  const dates = Array.from({ length: 7 }, (_, i) => dateStr(i))
  const dailyTotals = await Promise.all(
    dates.map(async d => ({ date: d, visits: (await kv.get<number>(`stats:visits:${d}`)) ?? 0 }))
  )

  const todayVisits = dailyTotals[0].visits
  const weekVisits = dailyTotals.reduce((s, d) => s + d.visits, 0)

  // Top pages for today
  const pagesList = (await kv.get<string[]>(`stats:pages-list:${today}`)) ?? []
  const pageCounts = await Promise.all(
    pagesList.map(async p => ({ path: p, visits: (await kv.get<number>(`stats:page:${p}:${today}`)) ?? 0 }))
  )
  const topPages = pageCounts.sort((a, b) => b.visits - a.visits).slice(0, 5)

  return NextResponse.json({ todayVisits, weekVisits, dailyTotals: dailyTotals.reverse(), topPages })
}
