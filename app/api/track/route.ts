import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json() as { path?: string }
    if (!path) return NextResponse.json({ ok: false })

    const date = new Date().toISOString().split('T')[0]

    // Increment daily total
    const totalKey = `stats:visits:${date}`
    const total = (await kv.get<number>(totalKey)) ?? 0
    await kv.set(totalKey, total + 1)

    // Increment per-page count
    const pageKey = `stats:page:${path}:${date}`
    const pageCount = (await kv.get<number>(pageKey)) ?? 0
    await kv.set(pageKey, pageCount + 1)

    // Maintain list of visited pages for this date (for top-pages query)
    const listKey = `stats:pages-list:${date}`
    const pages = (await kv.get<string[]>(listKey)) ?? []
    if (!pages.includes(path)) {
      await kv.set(listKey, [...pages, path])
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
