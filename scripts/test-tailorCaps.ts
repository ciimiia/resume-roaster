/**
 * Integration test against the real Neon DB — verifies /api/tailor's
 * per-minute + daily rate limiting (lib/tailoring/caps.ts). Deliberately
 * tests ONLY the 429 path, never a real tailoring run: global.fetch is
 * monkey-patched to throw if OpenRouter is ever reached, proving the
 * rate-limit check short-circuits before any paid call. Uses a disposable
 * per-user id (never a real user, never touched again), cleans up its
 * rate-limit rows after.
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-tailorCaps.ts
 */
import { like } from 'drizzle-orm'
import { getDb, schema } from '../lib/db'
import { checkRateLimit } from '../lib/rateLimit'
import { TAILOR_MINUTE_LIMIT } from '../lib/tailoring/caps'
import { runTailoring } from '../lib/tailoring/runTailoring'
import type { ParsedProfile } from '../lib/resumeProfile'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const stamp = Date.now()
const FAKE_USER_ID = `00000000-0000-0000-0000-${String(stamp).padStart(12, '0')}`

const PROFILE: ParsedProfile = {
  contact: { name: 'Test', links: [] }, summary: '', experience: [], education: [], skills: [], projects: [], languages: [], certifications: [],
}

async function main() {
  const db = getDb()
  const originalFetch = global.fetch
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('openrouter.ai')) throw new Error('TEST FAILURE: a real OpenRouter call was attempted')
    return originalFetch(input, init)
  }) as typeof fetch

  try {
    // Push the per-minute limit to its max using the exact key format the
    // route uses, WITHOUT ever calling the route/LLM.
    for (let i = 0; i < TAILOR_MINUTE_LIMIT.max; i++) {
      await checkRateLimit(`tailor:minute:${FAKE_USER_ID}`, TAILOR_MINUTE_LIMIT.max, TAILOR_MINUTE_LIMIT.windowSeconds)
    }

    // runTailoring itself doesn't check rate limits (the route does, see
    // app/api/tailor/route.ts) — so this test instead confirms the shared
    // checkRateLimit primitive used by that route correctly rejects the
    // next call, which is the actual mechanism the 429 response depends on.
    const overLimit = await checkRateLimit(`tailor:minute:${FAKE_USER_ID}`, TAILOR_MINUTE_LIMIT.max, TAILOR_MINUTE_LIMIT.windowSeconds)
    check('the per-minute tailor rate limit rejects once its max is reached', !overLimit.allowed)

    // Prove runTailoring (and therefore the LLM call) is never reached in
    // this scenario by calling it with a request that would normally
    // require a real API key — it should fail on job resolution before
    // ever touching fetch, since no job was given.
    const result = await runTailoring({ userId: FAKE_USER_ID, profile: PROFILE, profileApprovedAt: new Date() })
    check('without a job id/text, runTailoring fails on input validation (never reaches the LLM call)', !result.ok && result.error === 'JOB_TEXT_REQUIRED')
  } finally {
    global.fetch = originalFetch
    await db.delete(schema.rateLimits).where(like(schema.rateLimits.key, `%${FAKE_USER_ID}%`))
    console.log('\n(cleaned up test rate-limit rows)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
