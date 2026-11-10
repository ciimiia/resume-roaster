/**
 * Integration test against the real Neon DB — verifies /api/analyze's rate
 * limiting (IP-scoped + the site-wide daily cap share the same
 * lib/rateLimit.ts primitive already proven in the signup/signin routes,
 * see app/api/analyze/route.ts's comment on why an anonymous, paid-API
 * endpoint needs both).
 *
 * Deliberately tests ONLY the 429 path, never the success path — this
 * must never make a real OpenRouter call. Two separate methods of proof:
 *   1. global.fetch is monkey-patched to throw if ever called — if a rate
 *      limit check ever failed to short-circuit the route, this test
 *      itself would fail loudly rather than silently calling a paid API.
 *   2. The IP-scoped check is pushed to its limit using a throwaway,
 *      stamped fake IP that collides with nothing real, then cleaned up.
 *      The site-wide daily cap is NOT touched directly (that's live,
 *      shared production state) — instead, the identical underlying
 *      checkRateLimit primitive is proven generically with its own
 *      disposable test key, which is the same mechanism the global cap
 *      relies on.
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-analyzeRateLimit.ts
 */
import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../lib/db'
import { checkRateLimit } from '../lib/rateLimit'
import { IP_LIMIT } from '../lib/analyzeRateLimit'
import { POST } from '../app/api/analyze/route'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const stamp = Date.now()
const FAKE_IP = `test-analyze-ip-${stamp}`
const GENERIC_TEST_KEY = `test-ratelimit-generic-${stamp}`

async function main() {
  const db = getDb()
  // Guards only the OpenRouter call specifically — Neon's own HTTP driver
  // also uses global.fetch for every DB query, so a blanket replacement
  // would break the DB connection this test itself needs, not just prove
  // the thing it's trying to prove.
  const originalFetch = global.fetch
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('openrouter.ai')) {
      throw new Error('TEST FAILURE: a real OpenRouter call was attempted — this test must never reach that code')
    }
    return originalFetch(input, init)
  }) as typeof fetch

  try {
    // --- 1. the underlying primitive: allowed up to max, then not ---
    let allowedCount = 0
    for (let i = 0; i < IP_LIMIT.max; i++) {
      const r = await checkRateLimit(GENERIC_TEST_KEY, IP_LIMIT.max, IP_LIMIT.windowSeconds)
      if (r.allowed) allowedCount++
    }
    check(`checkRateLimit allows exactly ${IP_LIMIT.max} calls within the window`, allowedCount === IP_LIMIT.max)
    const overLimit = await checkRateLimit(GENERIC_TEST_KEY, IP_LIMIT.max, IP_LIMIT.windowSeconds)
    check('the next call past the limit is rejected (allowed=false)', !overLimit.allowed)
    check('a rejected call reports a positive retryAfterSeconds', (overLimit.retryAfterSeconds ?? 0) > 0)

    // --- 2. the real route returns 429 once its IP-scoped limit is hit,
    // without ever reaching the OpenRouter-calling code ---
    for (let i = 0; i < IP_LIMIT.max; i++) {
      await checkRateLimit(`analyze:ip:${FAKE_IP}`, IP_LIMIT.max, IP_LIMIT.windowSeconds)
    }

    const formData = new FormData()
    formData.append('useSampleText', 'true')
    formData.append('mode', 'roast')
    const req = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'x-forwarded-for': FAKE_IP },
      body: formData,
    })

    const res = await POST(req)
    check('route returns 429 once the IP limit is exhausted', res.status === 429)
    const body = await res.json()
    check('429 response body reports RATE_LIMITED', body.error === 'RATE_LIMITED')
  } finally {
    global.fetch = originalFetch
    await db.delete(schema.rateLimits).where(eq(schema.rateLimits.key, GENERIC_TEST_KEY))
    await db.delete(schema.rateLimits).where(eq(schema.rateLimits.key, `analyze:ip:${FAKE_IP}`))
    console.log('\n(cleaned up test rate-limit rows — the site-wide analyze:global:day key was never touched)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
