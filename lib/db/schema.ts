/**
 * Drizzle schema — Phase 0 scaffold.
 *
 * This only proves the Postgres/Drizzle/migration pipeline end to end; the
 * real domain model (User, Resume, Profile, Preference, ...) is Phase 1's
 * job, not this one. Don't build on `healthChecks` — it's a throwaway
 * connectivity probe, not a real table. Delete it once Phase 1 adds actual
 * tables and this file has something real to migrate instead.
 */

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const healthChecks = pgTable('health_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  note: text('note').notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
})
