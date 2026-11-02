import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { saveResult } from '@/lib/db/results'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import type { ModeId, AnalysisResult } from '@/lib/types'

export type { SavedResult, AnalysisSummary } from '@/lib/db/results'

export async function POST(req: NextRequest) {
  const { mode, result } = await req.json() as { mode: ModeId; result: AnalysisResult }

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
