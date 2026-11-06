import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { runJobEmbedding } from '@/lib/jobIngestion/embedRunner'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runJobEmbedding()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/embed-jobs] run failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
