/**
 * Postgres (Neon) connection, via Drizzle's neon-http driver.
 *
 * Lazily initialized: importing this module never throws, even if
 * DATABASE_URL isn't set yet — the connection is only created, and
 * env.databaseUrl's "missing var" error only thrown, the first time
 * something actually calls `getDb()`. This means every existing route can
 * keep importing freely from anywhere without caring whether Postgres is
 * configured yet; only code that actually needs the DB pays that cost.
 *
 * Usage: `const db = getDb()` inside a request handler, not at module
 * top level (top-level would defeat the lazy init and run at build/import
 * time instead of request time).
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { env } from '@/lib/env'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

let cached: Db | null = null

/**
 * Neon's serverless Postgres branch suspends its compute after a period of
 * inactivity — the first query to reach it after that has to wait for it to
 * wake up, which can exceed undici's connect timeout and surface as a
 * connection error even though nothing is actually broken (seen firsthand:
 * an idle gap of just a few seconds between two scripts was enough to
 * trigger this). A couple of short retries absorb that cold-start case
 * without masking a genuinely dead connection — bounded (RETRY_DELAYS_MS
 * below) and only for this specific error shape; anything else propagates
 * immediately.
 */
const RETRY_DELAYS_MS = [500, 1500]
export function isRetryableConnectError(err: unknown): boolean {
  let cur: unknown = err
  for (let i = 0; i < 6 && cur; i++) {
    const code = (cur as { code?: unknown })?.code
    const name = (cur as { name?: unknown })?.name
    if (code === 'UND_ERR_CONNECT_TIMEOUT' || name === 'ConnectTimeoutError') return true
    cur = (cur as { cause?: unknown })?.cause
  }
  return false
}

export function withConnectRetry<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn(...args)
      } catch (err) {
        if (!isRetryableConnectError(err) || attempt >= RETRY_DELAYS_MS.length) throw err
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
      }
    }
  }
}

/**
 * Wraps the methods drizzle's neon-http driver actually calls (`query` for
 * normal queries, `transaction` for batched ones — see
 * drizzle-orm/neon-http/session.js) with the retry above. Everything else
 * (including calling the client directly as a tagged-template function)
 * passes through unchanged via the Proxy's default behavior.
 */
function withRetryingClient<AM extends boolean, FR extends boolean>(
  client: NeonQueryFunction<AM, FR>
): NeonQueryFunction<AM, FR> {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if ((prop === 'query' || prop === 'transaction') && typeof value === 'function') {
        return withConnectRetry(value.bind(target))
      }
      return value
    },
  })
}

export function getDb(): Db {
  if (!cached) {
    const sql = neon(env.databaseUrl) // throws env's clear error if DATABASE_URL is missing
    cached = drizzle(withRetryingClient(sql), { schema })
  }
  return cached
}

export { schema }
