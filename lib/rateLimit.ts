/**
 * Basic fixed-window rate limiting, backed by Postgres (lib/db/schema.ts
 * `rateLimits`). Nothing existed for this in the old KV setup — new in
 * Phase 1.
 *
 * Fixed-window, not sliding: a key gets `max` attempts per `windowSeconds`,
 * and the window resets (count back to 0) the first time it's touched after
 * expiring. Simple, atomic via upsert, good enough for "basic" — a sliding
 * window or token bucket would be more precise at the boundary but isn't
 * needed here.
 *
 * Two primitives, used differently depending on what's being limited:
 *
 * - `checkRateLimit` — check-and-record in one call, every call counts as
 *   an attempt. Right for "throttle how often this endpoint can be hit",
 *   e.g. signup-by-email, or any*-by-IP (volumetric abuse, not credential
 *   guessing — a legitimate burst of traffic from one IP should still
 *   eventually get throttled).
 *
 * - `peekRateLimit` + `recordFailure` — check without consuming, record
 *   only on failure. Right for signin-by-email specifically: counting
 *   *every* attempt (including correct ones) would let an attacker lock a
 *   victim out just by submitting a few wrong passwords for their email —
 *   a legitimate signin should never be blocked by someone else's prior
 *   failures. Counting only failures still bounds brute-force guessing.
 */

import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from './db'

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the window resets, only meaningful when allowed is false. */
  retryAfterSeconds?: number
}

async function readWindow(key: string) {
  const db = getDb()
  const rows = await db.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, key)).limit(1)
  return rows[0] ?? null
}

/** Read-only — does NOT count as an attempt. Use before doing the actual work, to reject early if already over the limit. */
export async function peekRateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  const row = await readWindow(key)
  if (!row) return { allowed: true }

  const windowAgeSeconds = (Date.now() - row.windowStart.getTime()) / 1000
  if (windowAgeSeconds > windowSeconds) return { allowed: true } // expired, will reset on next record

  if (row.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowSeconds - windowAgeSeconds) }
  }
  return { allowed: true }
}

/** Records one attempt (e.g. one failed signin) against `key`, starting or continuing its fixed window. */
export async function recordFailure(key: string, windowSeconds: number): Promise<void> {
  const db = getDb()
  const now = new Date()
  const row = await readWindow(key)

  if (!row) {
    await db.insert(schema.rateLimits).values({ key, count: 1, windowStart: now })
    return
  }

  const windowAgeSeconds = (now.getTime() - row.windowStart.getTime()) / 1000
  if (windowAgeSeconds > windowSeconds) {
    await db.update(schema.rateLimits).set({ count: 1, windowStart: now }).where(eq(schema.rateLimits.key, key))
    return
  }

  await db.update(schema.rateLimits)
    .set({ count: sql`${schema.rateLimits.count} + 1` })
    .where(eq(schema.rateLimits.key, key))
}

/** Check-and-record in one call — every call (success or failure) counts as an attempt. Use for volumetric throttling (signup, any*-by-IP). */
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  const db = getDb()
  const now = new Date()
  const row = await readWindow(key)

  if (!row) {
    await db.insert(schema.rateLimits).values({ key, count: 1, windowStart: now })
    return { allowed: true }
  }

  const windowAgeSeconds = (now.getTime() - row.windowStart.getTime()) / 1000

  if (windowAgeSeconds > windowSeconds) {
    await db.update(schema.rateLimits).set({ count: 1, windowStart: now }).where(eq(schema.rateLimits.key, key))
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
