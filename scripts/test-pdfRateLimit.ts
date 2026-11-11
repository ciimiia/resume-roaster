/**
 * Integration test against the real Neon DB — verifies the shared PDF
 * rate limit (lib/tailoring/caps.ts's PDF_WINDOW_LIMIT/PDF_DAILY_LIMIT,
 * the `pdf:window:*`/`pdf:day:*` keys both app/api/tailor/[id]/pdf and
 * app/api/cover-letter/[id]/pdf check — see those routes' comments).
 *
 * Does NOT invoke the route handlers directly (same reasoning as
 * test-analyzeRateLimit.ts/test-tailorCaps.ts's scope note): these routes
 * read the session via `cookies()` from next/headers, which only works
 * inside Next's own request lifecycle, not a plain script. Instead this
 * exercises the exact checkRateLimit primitive + key format + limits the
 * routes use — the actual mechanism the 429 response depends on — using
 * disposable keys. Never launches Chromium, never calls any paid API.
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-pdfRateLimit.ts
 */
import { like } from 'drizzle-orm'
import { getDb, schema } from '../lib/db'
import { checkRateLimit } from '../lib/rateLimit'
import { PDF_WINDOW_LIMIT, PDF_DAILY_LIMIT } from '../lib/tailoring/caps'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const stamp = Date.now()
const FAKE_USER_ID = `00000000-0000-0000-0000-${String(stamp).padStart(12, '0')}`

async function main() {
  const db = getDb()

  try {
    for (let i = 0; i < PDF_WINDOW_LIMIT.max; i++) {
      await checkRateLimit(`pdf:window:${FAKE_USER_ID}`, PDF_WINDOW_LIMIT.max, PDF_WINDOW_LIMIT.windowSeconds)
    }
    const overWindowLimit = await checkRateLimit(`pdf:window:${FAKE_USER_ID}`, PDF_WINDOW_LIMIT.max, PDF_WINDOW_LIMIT.windowSeconds)
    check(`the shared PDF window limit (${PDF_WINDOW_LIMIT.max}/${PDF_WINDOW_LIMIT.windowSeconds}s) rejects once its max is reached`, !overWindowLimit.allowed)
    check('a rejected PDF window check reports a positive retryAfterSeconds', (overWindowLimit.retryAfterSeconds ?? 0) > 0)

    // Independent key — the daily cap is checked separately from the
    // window cap in both routes (Promise.all of both checks), so this
    // proves the daily limit rejects on its own too, not just the window one.
    const DAILY_FAKE_USER_ID = `${FAKE_USER_ID}-daily`
    for (let i = 0; i < PDF_DAILY_LIMIT.max; i++) {
      await checkRateLimit(`pdf:day:${DAILY_FAKE_USER_ID}`, PDF_DAILY_LIMIT.max, PDF_DAILY_LIMIT.windowSeconds)
    }
    const overDailyLimit = await checkRateLimit(`pdf:day:${DAILY_FAKE_USER_ID}`, PDF_DAILY_LIMIT.max, PDF_DAILY_LIMIT.windowSeconds)
    check(`the shared PDF daily limit (${PDF_DAILY_LIMIT.max}/day) rejects once its max is reached`, !overDailyLimit.allowed)

    // A different user's key is unaffected — the limit is per-user, not global.
    const OTHER_USER_ID = `${FAKE_USER_ID}-other`
    const otherUserCheck = await checkRateLimit(`pdf:window:${OTHER_USER_ID}`, PDF_WINDOW_LIMIT.max, PDF_WINDOW_LIMIT.windowSeconds)
    check('a different user\'s PDF window limit is unaffected (per-user, not shared globally)', otherUserCheck.allowed)
  } finally {
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
