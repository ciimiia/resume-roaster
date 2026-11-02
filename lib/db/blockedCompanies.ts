import { eq } from 'drizzle-orm'
import { getDb, schema } from './index'

/** lowercase + trim — good enough to catch "Stripe" vs "stripe " without pulling in a fuzzy-matching dependency for this. */
export function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase()
}

export interface BlockedCompanyRecord {
  id: string
  companyName: string
  normalizedName: string
  reason: string | null
  createdAt: string
}

function toRecord(row: typeof schema.blockedCompanies.$inferSelect): BlockedCompanyRecord {
  return {
    id: row.id,
    companyName: row.companyName,
    normalizedName: row.normalizedName,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listBlockedCompanies(): Promise<BlockedCompanyRecord[]> {
  const db = getDb()
  const rows = await db.select().from(schema.blockedCompanies).orderBy(schema.blockedCompanies.companyName)
  return rows.map(toRecord)
}

/** Idempotent — blocking an already-blocked company (even under different casing) is a no-op, not an error. */
export async function blockCompany(companyName: string, reason?: string): Promise<BlockedCompanyRecord> {
  const db = getDb()
  const normalizedName = normalizeCompanyName(companyName)
  const rows = await db.insert(schema.blockedCompanies)
    .values({ companyName, normalizedName, reason: reason ?? null })
    .onConflictDoUpdate({ target: schema.blockedCompanies.normalizedName, set: { companyName, reason: reason ?? null } })
    .returning()
  return toRecord(rows[0])
}

export async function unblockCompany(id: string): Promise<void> {
  const db = getDb()
  await db.delete(schema.blockedCompanies).where(eq(schema.blockedCompanies.id, id))
}

/** Loaded once per ingestion run / match query, not per-row — see lib/jobIngestion/runner.ts and lib/matching/filters.ts. */
export async function getBlockedCompanyNormalizedSet(): Promise<Set<string>> {
  const rows = await listBlockedCompanies()
  return new Set(rows.map(r => r.normalizedName))
}
