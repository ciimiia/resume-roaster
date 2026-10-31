import { eq, inArray, sql } from 'drizzle-orm'
import { getDb, schema } from './index'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

/** Atomic increment — fixes the read-then-write race the old KV version had. */
export async function recordVisit(path: string): Promise<void> {
  const db = getDb()
  const date = todayStr()
  await db.insert(schema.pageVisits)
    .values({ date, path, count: 1 })
    .onConflictDoUpdate({
      target: [schema.pageVisits.date, schema.pageVisits.path],
      set: { count: sql`${schema.pageVisits.count} + 1` },
    })
}

export interface DailyTotal { date: string; visits: number }
export interface TopPage { path: string; visits: number }

export async function getStats(): Promise<{
  todayVisits: number
  weekVisits: number
  dailyTotals: DailyTotal[]
  topPages: TopPage[]
}> {
  const db = getDb()
  const today = todayStr()
  const dates = Array.from({ length: 7 }, (_, i) => dateStr(i))

  const totalsByDate = await db.select({
    date: schema.pageVisits.date,
    visits: sql<number>`sum(${schema.pageVisits.count})::int`,
  })
    .from(schema.pageVisits)
    .where(inArray(schema.pageVisits.date, dates))
    .groupBy(schema.pageVisits.date)

  const byDate = new Map(totalsByDate.map(r => [r.date, r.visits]))
  const dailyTotals: DailyTotal[] = dates.map(date => ({ date, visits: byDate.get(date) ?? 0 })).reverse()
  const todayVisits = byDate.get(today) ?? 0
  const weekVisits = dailyTotals.reduce((s, d) => s + d.visits, 0)

  const topPagesRaw = await db.select({ path: schema.pageVisits.path, visits: schema.pageVisits.count })
    .from(schema.pageVisits)
    .where(eq(schema.pageVisits.date, today))
  const topPages = topPagesRaw.sort((a, b) => b.visits - a.visits).slice(0, 5)

  return { todayVisits, weekVisits, dailyTotals, topPages }
}
