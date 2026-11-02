import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { runIngestion } from '@/lib/jobIngestion/runner'

// Cron-invoked functions get a longer ceiling than normal requests on most
// Vercel plans; the runner's own internal time budget (45s, see
// lib/jobIngestion/runner.ts) stays below this with headroom.
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runIngestion()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/ingest-jobs] run failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
