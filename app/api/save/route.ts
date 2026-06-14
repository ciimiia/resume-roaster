import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { kv } from '@/lib/kv'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import type { ModeId, AnalysisResult } from '@/lib/types'

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

const TTL = 60 * 60 * 24 * 90 // 90 days

export async function POST(req: NextRequest) {
  const { mode, result } = await req.json() as { mode: ModeId; result: AnalysisResult }

  // Resolve logged-in user (optional)
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  const id = crypto.randomUUID().slice(0, 8)
  const payload: SavedResult = {
    id, mode, result,
    savedAt: new Date().toISOString(),
    ...(session ? { userId: session.userId } : {}),
  }

  await kv.set(`result:${id}`, payload, { ex: TTL })

  // Add summary to user's list
  if (session) {
    const summary: AnalysisSummary = {
      id, mode,
      score: result.score,
      grade: result.grade,
      verdict: result.verdict,
      savedAt: payload.savedAt,
    }
    const existing = await kv.get<AnalysisSummary[]>(`user:analyses:${session.userId}`) ?? []
    await kv.set(`user:analyses:${session.userId}`, [summary, ...existing].slice(0, 50))
  }

  return NextResponse.json({ id })
}
