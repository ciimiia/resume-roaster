import { NextRequest, NextResponse } from 'next/server'
import { RESULTS } from '@/lib/data'
import type { ModeId } from '@/lib/types'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const mode = ((formData.get('mode') as string) || 'roast') as ModeId

  const result = RESULTS[mode] ?? RESULTS.roast
  return NextResponse.json(result)
}
