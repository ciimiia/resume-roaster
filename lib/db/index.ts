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
import { neon } from '@neondatabase/serverless'
import { env } from '@/lib/env'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

let cached: Db | null = null

export function getDb(): Db {
  if (!cached) {
    const sql = neon(env.databaseUrl) // throws env's clear error if DATABASE_URL is missing
    cached = drizzle(sql, { schema })
  }
  return cached
}

export { schema }
