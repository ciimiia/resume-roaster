import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'
import type { ModeId, AnalysisResult } from '@/lib/types'

export interface SavedResult {
  id: string
  mode: ModeId
  result: AnalysisResult
  savedAt: string
}

// Results expire after 90 days
const TTL_SECONDS = 60 * 60 * 24 * 90

export async function POST(req: NextRequest) {
  const { mode, result } = await req.json() as { mode: ModeId; result: AnalysisResult }

  const id = crypto.randomUUID().slice(0, 8)
  const payload: SavedResult = { id, mode, result, savedAt: new Date().toISOString() }

  await kv.set(`result:${id}`, payload, { ex: TTL_SECONDS })

  return NextResponse.json({ id })
}
