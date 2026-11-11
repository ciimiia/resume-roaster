import { eq, and, isNull, gt } from 'drizzle-orm'
import { getDb, schema } from './index'

export async function createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  const db = getDb()
  await db.insert(schema.passwordResetTokens).values({ userId, tokenHash, expiresAt })
}

export interface ValidResetToken {
  id: string
  userId: string
}

/** Single-use + expiring: only matches a token that is neither used nor past its expiry. */
export async function findValidResetToken(tokenHash: string): Promise<ValidResetToken | null> {
  const db = getDb()
  const rows = await db.select({ id: schema.passwordResetTokens.id, userId: schema.passwordResetTokens.userId })
    .from(schema.passwordResetTokens)
    .where(and(
      eq(schema.passwordResetTokens.tokenHash, tokenHash),
      isNull(schema.passwordResetTokens.usedAt),
      gt(schema.passwordResetTokens.expiresAt, new Date()),
    ))
    .limit(1)
  return rows[0] ?? null
}

export async function markResetTokenUsed(id: string): Promise<void> {
  const db = getDb()
  await db.update(schema.passwordResetTokens).set({ usedAt: new Date() }).where(eq(schema.passwordResetTokens.id, id))
}

/** Invalidates every other outstanding token for this user after a successful reset, so an older unused reset link can't still work. */
export async function invalidateAllResetTokensForUser(userId: string): Promise<void> {
  const db = getDb()
  await db.update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.passwordResetTokens.userId, userId), isNull(schema.passwordResetTokens.usedAt)))
}
