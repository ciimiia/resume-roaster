/**
 * Password reset — single-use, expiring, hashed tokens. Behind
 * env.hasEmailProvider: when no email provider is configured, this
 * module's request/reset functions are never reached (the API routes
 * check env.hasEmailProvider first and fail closed, see
 * app/api/auth/forgot-password/route.ts), so there is no degraded/partial
 * mode — the feature is either fully on or entirely hidden.
 *
 * No user enumeration: requestPasswordReset always returns the same
 * {ok: true} shape whether or not the email matches an account — only
 * the presence/absence of an email in the inbox reveals that, never the
 * API response or its timing-sensitive shape.
 */
import 'server-only'
import { randomBytes, createHash } from 'crypto'
import { env } from '@/lib/env'
import { findUserByEmail, updatePasswordHash } from '@/lib/db/users'
import { createResetToken, findValidResetToken, markResetTokenUsed, invalidateAllResetTokensForUser } from '@/lib/db/passwordResetTokens'
import { getEmailProvider } from '@/lib/email'
import { hashPassword } from '@/lib/password'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

/** Always resolves successfully regardless of whether the email matches an account — see this file's top comment. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findUserByEmail(email)
  if (!user) return // no enumeration signal — silently no-op

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  await createResetToken(user.id, tokenHash, new Date(Date.now() + TOKEN_TTL_MS))

  const resetUrl = `${env.siteUrl}/reset-password?token=${rawToken}`
  const provider = getEmailProvider()
  const result = await provider.send({
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you didn't request this, ignore this email.`,
  })
  if (!result.ok) {
    // Logged, not surfaced — the caller already committed to the
    // no-enumeration {ok: true} response before this resolves.
    console.error('[passwordReset] failed to send reset email, provider error:', result.error)
  }
}

export type ResetPasswordResult = { ok: true } | { ok: false; error: 'INVALID_OR_EXPIRED_TOKEN' }

export async function resetPassword(rawToken: string, newPassword: string): Promise<ResetPasswordResult> {
  const tokenHash = hashToken(rawToken)
  const valid = await findValidResetToken(tokenHash)
  if (!valid) return { ok: false, error: 'INVALID_OR_EXPIRED_TOKEN' }

  const passwordHash = await hashPassword(newPassword)
  await updatePasswordHash(valid.userId, passwordHash)
  await markResetTokenUsed(valid.id)
  await invalidateAllResetTokensForUser(valid.userId) // any other outstanding reset link for this user stops working too

  return { ok: true }
}
