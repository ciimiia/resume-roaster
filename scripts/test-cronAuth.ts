/**
 * Tests the shared CRON_SECRET bearer-token check (lib/cronAuth.ts), used
 * by /api/cron/ingest-jobs (and the pattern app/api/cron/generate-post
 * follows inline). No live network — just the auth predicate itself.
 *
 * Run with: npx tsx scripts/test-cronAuth.ts
 */
import { isAuthorizedCronRequest } from '../lib/cronAuth'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

function fakeRequest(authHeader: string | null) {
  return { headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? authHeader : null) } }
}

function main() {
  process.env.CRON_SECRET = 'test-secret-value'

  check('correct Bearer token is authorized', isAuthorizedCronRequest(fakeRequest('Bearer test-secret-value')))
  check('missing Authorization header is rejected', !isAuthorizedCronRequest(fakeRequest(null)))
  check('wrong secret is rejected', !isAuthorizedCronRequest(fakeRequest('Bearer wrong-value')))
  check('missing "Bearer " prefix is rejected even with the right secret', !isAuthorizedCronRequest(fakeRequest('test-secret-value')))
  check('empty string header is rejected', !isAuthorizedCronRequest(fakeRequest('')))
  check('case-sensitive — lowercase "bearer" is rejected', !isAuthorizedCronRequest(fakeRequest('bearer test-secret-value')))

  delete process.env.CRON_SECRET
  check('any request is rejected when CRON_SECRET itself is not configured (fails closed, not open)', !isAuthorizedCronRequest(fakeRequest('Bearer test-secret-value')))

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
