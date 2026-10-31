import { and, eq, gt, desc } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { ModeId, AnalysisResult } from '@/lib/types'

const TTL_MS = 60 * 60 * 24 * 90 * 1000 // 90 days, same as the old KV TTL

export interface SavedResult {
  id: string
  mode: ModeId
  result: AnalysisResult
  savedAt: string
  userId?: string
}

export interface AnalysisSummary {
  id: string
  mode: ModeId
  score: number
  grade: string
  verdict: string
  savedAt: string
}

function shortId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export async function saveResult(mode: ModeId, result: AnalysisResult, userId?: string): Promise<string> {
  const db = getDb()
  const id = shortId()
  const now = new Date()
  await db.insert(schema.sharedResults).values({
    id,
    mode,
    result,
    userId: userId ?? null,
    savedAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  })
  return id
}

/** Returns null for a missing OR expired result — same "not found" behavior as the old TTL'd KV key. */
export async function getResult(id: string): Promise<SavedResult | null> {
  const db = getDb()
  const rows = await db.select().from(schema.sharedResults)
    .where(and(eq(schema.sharedResults.id, id), gt(schema.sharedResults.expiresAt, new Date())))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    mode: row.mode as ModeId,
    result: row.result as AnalysisResult,
    savedAt: row.savedAt.toISOString(),
    userId: row.userId ?? undefined,
  }
}

/** For the dashboard — most recent 50, newest first. Expired results are excluded. */
export async function listResultsForUser(userId: string): Promise<AnalysisSummary[]> {
  const db = getDb()
  const rows = await db.select().from(schema.sharedResults)
    .where(and(eq(schema.sharedResults.userId, userId), gt(schema.sharedResults.expiresAt, new Date())))
    .orderBy(desc(schema.sharedResults.savedAt))
    .limit(50)
  return rows.map(row => {
    const r = row.result as AnalysisResult
    return {
      id: row.id,
      mode: row.mode as ModeId,
      score: r.score,
      grade: r.grade,
      verdict: r.verdict,
      savedAt: row.savedAt.toISOString(),
    }
  })
}
