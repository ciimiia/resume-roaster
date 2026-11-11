/**
 * Integration test against the real Neon DB — verifies password-reset
 * token rules (lib/passwordReset.ts, lib/db/passwordResetTokens.ts):
 * single-use, expiring, stored only as a hash, no user enumeration. The
 * Resend API call is mocked (never sends a real email) — this test must
 * never actually email anyone or spend real money.
 *
 * Run with:
 *   set -a; source .env.local; set +a; npx tsx scripts/test-passwordReset.ts
 */
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../lib/db'
import { createUser, findUserById } from '../lib/db/users'
import { requestPasswordReset, resetPassword } from '../lib/passwordReset'
import { verifyPassword } from '../lib/password'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

async function main() {
  const db = getDb()
  const stamp = Date.now()
  let user: Awaited<ReturnType<typeof createUser>> | null = null

  // Mocks Resend's API only — never a real network call, never a real email.
  // An object (not bare `let`s) so TS doesn't over-narrow these to their
  // initial `null` literal across the async-closure assignment below.
  const captured: { emailTo: string | null; bodyText: string | null } = { emailTo: null, bodyText: null }
  const originalFetch = global.fetch
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('api.resend.com')) {
      const body = JSON.parse(String(init?.body ?? '{}'))
      captured.emailTo = body.to
      captured.bodyText = body.text
      return { ok: true, json: async () => ({ id: 'test-email-id' }) } as Response
    }
    return originalFetch(input, init)
  }) as typeof fetch
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test-key-not-real'

  try {
    user = await createUser(`pwreset-test-${stamp}@example.com`, 'not-a-real-hash')

    // --- no user enumeration: a nonexistent email resolves without throwing, without sending anything ---
    captured.emailTo = null
    await requestPasswordReset(`pwreset-nonexistent-${stamp}@example.com`)
    check('requesting a reset for a nonexistent email does not throw', true) // reaching here means it didn't throw
    check('no email is sent for a nonexistent email', captured.emailTo === null)

    // --- real user: an email is "sent" (mocked) with a reset link, never the raw token logged/exposed elsewhere ---
    await requestPasswordReset(user.email)
    const bodyText = captured.bodyText
    check('an email is sent to the real user\'s address', captured.emailTo === user.email)
    check('the email body contains a reset link', !!bodyText && bodyText.includes('/reset-password?token='))

    const rawToken = bodyText?.match(/token=([a-f0-9]+)/)?.[1]
    check('a 256-bit (64 hex char) token was generated', !!rawToken && rawToken.length === 64)

    // --- token is stored only as a hash, never the raw value ---
    const rows = await db.select().from(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, user.id))
    check('exactly one token row exists for this user', rows.length === 1)
    check('the stored tokenHash is NOT the raw token (hashed, not plaintext)', rows[0].tokenHash !== rawToken)

    // --- using the token resets the password ---
    const result = await resetPassword(rawToken!, 'a-new-password-123')
    check('resetPassword succeeds with a valid token', result.ok)
    const updatedUser = await findUserById(user.id)
    check('the password hash actually changed', updatedUser!.passwordHash !== 'not-a-real-hash')
    check('the new password verifies correctly', await verifyPassword('a-new-password-123', updatedUser!.passwordHash))

    // --- single-use: the same token cannot be used again ---
    const reuseResult = await resetPassword(rawToken!, 'another-password-456')
    check('reusing the same token fails (single-use)', !reuseResult.ok && reuseResult.error === 'INVALID_OR_EXPIRED_TOKEN')

    // --- a garbage/never-issued token is rejected the same way ---
    const garbageResult = await resetPassword('0'.repeat(64), 'whatever-password')
    check('an invalid/never-issued token is rejected', !garbageResult.ok && garbageResult.error === 'INVALID_OR_EXPIRED_TOKEN')

    // --- expiry: a token past its expiresAt is rejected even if otherwise valid ---
    await db.update(schema.passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000), usedAt: null })
      .where(eq(schema.passwordResetTokens.userId, user.id))
    const expiredResult = await resetPassword(rawToken!, 'yet-another-password')
    check('an expired token is rejected even though it was never marked used', !expiredResult.ok && expiredResult.error === 'INVALID_OR_EXPIRED_TOKEN')
  } finally {
    global.fetch = originalFetch
    if (user) await db.delete(schema.users).where(eq(schema.users.id, user.id)) // cascades password_reset_tokens
    console.log('\n(cleaned up test user + reset tokens)')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
