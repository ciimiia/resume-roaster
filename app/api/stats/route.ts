import { NextResponse } from 'next/server'
import { countAllResults } from '@/lib/db/results'

// Public, unauthenticated — just a lifetime counter for the landing page.
// No PII, no per-user data.
//
// Without this, Next statically prerenders the route at build time (it has
// no dynamic inputs — no searchParams, no cookies/headers read) and the
// count freezes at whatever it was during that build, served from a cache
// forever after. Confirmed in a local production build: the route showed up
// as "○ (Static)" in the build output instead of "ƒ (Dynamic)".
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const count = await countAllResults()
    return NextResponse.json({ count })
  } catch (err) {
    console.error('[stats] GET failed:', err)
    return NextResponse.json({ count: null }, { status: 500 })
  }
}
