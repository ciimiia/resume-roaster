import { NextRequest, NextResponse } from 'next/server'
import { recordVisit } from '@/lib/db/stats'

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json() as { path?: string }
    if (!path) return NextResponse.json({ ok: false })

    await recordVisit(path)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
