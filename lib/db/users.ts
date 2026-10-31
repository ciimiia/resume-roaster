import { eq } from 'drizzle-orm'
import { getDb, schema } from './index'

export interface StoredUser {
  id: string
  email: string
  passwordHash: string
  createdAt: string
}

const normalize = (email: string) => email.trim().toLowerCase()

function toStoredUser(row: typeof schema.users.$inferSelect): StoredUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Case-insensitive by convention — always normalizes before querying. */
export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const db = getDb()
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, normalize(email))).limit(1)
  return rows[0] ? toStoredUser(rows[0]) : null
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const db = getDb()
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
  return rows[0] ? toStoredUser(rows[0]) : null
}

/**
 * Creates a user. Throws if the (normalized) email already exists — the
 * UNIQUE constraint on users.email enforces this; callers should check
 * findUserByEmail first for a clean error message, but this is the actual
 * source of truth under concurrent signups.
 */
export async function createUser(email: string, passwordHash: string): Promise<StoredUser> {
  const db = getDb()
  const rows = await db.insert(schema.users)
    .values({ email: normalize(email), passwordHash })
    .returning()
  return toStoredUser(rows[0])
}

/** For the admin users list. */
export async function listAllUsers(): Promise<Pick<StoredUser, 'email' | 'createdAt'>[]> {
  const db = getDb()
  const rows = await db.select({ email: schema.users.email, createdAt: schema.users.createdAt })
    .from(schema.users)
    .orderBy(schema.users.createdAt)
  return rows.map(r => ({ email: r.email, createdAt: r.createdAt.toISOString() }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
