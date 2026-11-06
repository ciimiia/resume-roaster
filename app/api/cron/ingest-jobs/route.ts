import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { runIngestion } from '@/lib/jobIngestion/runner'
import { runJobEmbedding } from '@/lib/jobIngestion/embedRunner'

// Cron-invoked functions get a longer ceiling than normal requests on most
// Vercel plans. Embedding runs inside this same invocation rather than as
// its own scheduled cron — Vercel's Hobby plan caps a project at 2 cron
// jobs total, and this project's generate-post + ingest-jobs crons already
// use both slots (see the Phase 2a report re: confirming your plan tier).
// Folding embedding in here avoids needing a 3rd cron slot. (A standalone
// /api/cron/embed-jobs route still exists for manual/admin-triggered runs —
// it's just not in vercel.json's scheduled crons.) Budgets below are split
// so the combined run stays under maxDuration with headroom.
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ingestion = await runIngestion({ timeBudgetMs: 30_000 })
    const embedding = await runJobEmbedding({ timeBudgetMs: 20_000 })
    return NextResponse.json({ ingestion, embedding })
  } catch (err) {
    console.error('[cron/ingest-jobs] run failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
