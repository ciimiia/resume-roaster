/**
 * Smoke test for lib/password.ts — no test runner wired up in this project
 * yet, so this is a standalone script rather than a Jest/Vitest test.
 * Run with: npx tsx scripts/test-password.ts
 */

import { hashPassword, verifyPassword } from '../lib/password'

async function main() {
  let failures = 0
  const check = (label: string, condition: boolean) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
    if (!condition) failures++
  }

  const password = 'correct-horse-battery-staple'
  const hash = await hashPassword(password)

  check('hash looks like a PHC argon2id string', hash.startsWith('$argon2id$'))
  check('correct password verifies', await verifyPassword(password, hash))
  check('wrong password is rejected', !(await verifyPassword('wrong-password', hash)))
  check(
    'legacy (non-argon2) stored value fails closed, not throws',
    (await verifyPassword('anything', 'deadbeef:cafebabe')) === false
  )
  check(
    'garbage stored value fails closed, not throws',
    (await verifyPassword('anything', 'not even close to a hash')) === false
  )

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
