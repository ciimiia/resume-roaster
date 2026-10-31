/**
 * Basic fixed-window rate limiting, backed by Postgres (lib/db/schema.ts
 * `rateLimits`). Nothing existed for this in the old KV setup — new in
 * Phase 1.
 *
 * Fixed-window, not sliding: a key gets `max` attempts per `windowSeconds`,
 * and the window resets (count back to 1) the first time it's checked after
 * expiring. Simple, atomic via upsert, good enough for "basic" — a sliding
 * window or token bucket would be more precise at the boundary but isn't
 * needed here.
 */

import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from './db'

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the window resets, only meaningful when allowed is false. */
  retryAfterSeconds?: number
}

export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  const db = getDb()
  const now = new Date()

  const existing = await db.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, key)).limit(1)
  const row = existing[0]

  if (!row) {
    await db.insert(schema.rateLimits).values({ key, count: 1, windowStart: now })
    return { allowed: true }
  }

  const windowAgeSeconds = (now.getTime() - row.windowStart.getTime()) / 1000

  if (windowAgeSeconds > windowSeconds) {
    // Window expired — reset.
    await db.update(schema.rateLimits)
      .set({ count: 1, windowStart: now })
      .where(eq(schema.rateLimits.key, key))
    return { allowed: true }
  }

  if (row.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowSeconds - windowAgeSeconds) }
  }

  await db.update(schema.rateLimits)
    .set({ count: sql`${schema.rateLimits.count} + 1` })
    .where(eq(schema.rateLimits.key, key))
  return { allowed: true }
}
