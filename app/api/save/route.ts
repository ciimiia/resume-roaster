import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { saveResult } from '@/lib/db/results'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import type { ModeId, AnalysisResult } from '@/lib/types'
import { readJsonWithLimit } from '@/lib/requestSize'

export type { SavedResult, AnalysisSummary } from '@/lib/db/results'

const MAX_BODY_BYTES = 32 * 1024 // an AnalysisResult is a bounded shape (score/sections/wins/fixes), a few KB in practice

export async function POST(req: NextRequest) {
  const parsed = await readJsonWithLimit<{ mode: ModeId; result: AnalysisResult }>(req, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.error === 'TOO_LARGE' ? 413 : 400 })
  }
  const { mode, result } = parsed.data

  // Resolve logged-in user (optional)
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  try {
    const id = await saveResult(mode, result, session?.userId)
    return NextResponse.json({ id })
  } catch (err) {
    console.error('[save] failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
