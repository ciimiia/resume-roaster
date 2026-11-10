/**
 * Unit test for the Neon cold-start retry wrapper in lib/db/index.ts.
 * Neon's serverless compute suspends after inactivity; the first query
 * after that can exceed undici's connect timeout even though nothing is
 * actually broken (observed firsthand during Phase 2b verification — a
 * few seconds of idle time between two test scripts was enough to trigger
 * it). This checks the retry logic in isolation (no real DB needed):
 * it retries exactly once for the specific connect-timeout error shape,
 * and never retries (or retries more than once) for anything else.
 *
 * Run with: tsx scripts/test-dbConnectRetry.ts
 */
import { isRetryableConnectError, withConnectRetry } from '../lib/db'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

function connectTimeoutError(): Error {
  const inner = new Error('Connect Timeout Error') as Error & { code: string }
  inner.name = 'ConnectTimeoutError'
  inner.code = 'UND_ERR_CONNECT_TIMEOUT'
  const fetchFailed = new Error('fetch failed') as Error & { cause: unknown }
  fetchFailed.cause = inner
  const neonDbError = new Error('Error connecting to database') as Error & { cause: unknown }
  neonDbError.cause = fetchFailed
  return neonDbError
}

/**
 * Matches @neondatabase/serverless's ACTUAL shape (confirmed by reading
 * node_modules/@neondatabase/serverless/index.js directly): NeonDbError
 * links the error it caught via `.sourceError`, not the standard `.cause`.
 * An earlier version of isRetryableConnectError only walked `.cause` —
 * it passed every test here because connectTimeoutError() above (built
 * from guessing the shape, not reading the real source) also only used
 * `.cause`, so the test never exercised the real link name and the bug
 * shipped anyway. This fixture exists specifically so that mistake can't
 * repeat.
 */
function realNeonDbShapedError(): Error {
  const inner = new Error('Connect Timeout Error') as Error & { code: string }
  inner.name = 'ConnectTimeoutError'
  inner.code = 'UND_ERR_CONNECT_TIMEOUT'
  const fetchFailed = new Error('fetch failed') as Error & { cause: unknown }
  fetchFailed.cause = inner
  const neonDbError = new Error('Error connecting to database: TypeError: fetch failed') as Error & { sourceError: unknown }
  neonDbError.sourceError = fetchFailed // NOT .cause — see comment above
  return neonDbError
}

async function main() {
  check(
    'recognizes a Neon-wrapped connect-timeout error several cause-levels deep',
    isRetryableConnectError(connectTimeoutError())
  )
  check(
    'recognizes the REAL @neondatabase/serverless shape, linked via .sourceError not .cause',
    isRetryableConnectError(realNeonDbShapedError())
  )
  check(
    'does not misclassify an unrelated error as retryable',
    !isRetryableConnectError(new Error('column "foo" does not exist'))
  )
  check('does not misclassify undefined/null', !isRetryableConnectError(undefined) && !isRetryableConnectError(null))

  // --- retries on the cold-start error shape until it succeeds, within the bound ---
  let calls = 0
  const recoversOnSecondTry = withConnectRetry(async () => {
    calls++
    if (calls === 1) throw realNeonDbShapedError()
    return 'ok'
  })
  const result = await recoversOnSecondTry()
  check('a cold-start-shaped failure (real .sourceError shape) followed by success is retried and returns the success', result === 'ok' && calls === 2)

  // --- bounded — a persistently failing connection still throws eventually, not an infinite loop ---
  let calls2 = 0
  const alwaysFails = withConnectRetry(async () => {
    calls2++
    throw realNeonDbShapedError()
  })
  let threw = false
  try {
    await alwaysFails()
  } catch {
    threw = true
  }
  check('a persistent cold-start-shaped failure still throws after a bounded number of retries (not an infinite loop)', threw && calls2 === 3)

  // --- a non-retryable error is never retried ---
  let calls3 = 0
  const failsWithUnrelatedError = withConnectRetry(async () => {
    calls3++
    throw new Error('unique constraint violation')
  })
  let threw2 = false
  try {
    await failsWithUnrelatedError()
  } catch {
    threw2 = true
  }
  check('an unrelated error is not retried at all (fails on the first attempt)', threw2 && calls3 === 1)

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
