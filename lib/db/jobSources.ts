import { eq, asc } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { JobSourceId } from '@/lib/jobIngestion/types'

export interface JobSourceRow {
  id: string
  atsType: JobSourceId
  boardToken: string | null
  companyName: string
  enabled: boolean
  lastFetchedAt: string | null
  lastError: string | null
  createdAt: string
}

function toRow(row: typeof schema.jobSources.$inferSelect): JobSourceRow {
  return {
    id: row.id,
    atsType: row.atsType as JobSourceId,
    boardToken: row.boardToken,
    companyName: row.companyName,
    enabled: row.enabled,
    lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listEnabledJobSources(): Promise<JobSourceRow[]> {
  const db = getDb()
  const rows = await db.select().from(schema.jobSources)
    .where(eq(schema.jobSources.enabled, true))
    // Oldest-fetched-first — the ingestion runner's bounded-batch processing
    // (see lib/jobIngestion/runner.ts) picks up where the previous run left
    // off rather than always hitting the same sources first.
    .orderBy(asc(schema.jobSources.lastFetchedAt))
  return rows.map(toRow)
}

export async function listAllJobSources(): Promise<JobSourceRow[]> {
  const db = getDb()
  const rows = await db.select().from(schema.jobSources).orderBy(asc(schema.jobSources.companyName))
  return rows.map(toRow)
}

export async function createJobSource(input: {
  atsType: JobSourceId
  boardToken: string | null
  companyName: string
  enabled?: boolean
}): Promise<JobSourceRow> {
  const db = getDb()
  const rows = await db.insert(schema.jobSources).values({
    atsType: input.atsType,
    boardToken: input.boardToken,
    companyName: input.companyName,
    enabled: input.enabled ?? true,
  }).returning()
  return toRow(rows[0])
}

export async function recordFetchSuccess(sourceId: string): Promise<void> {
  const db = getDb()
  await db.update(schema.jobSources)
    .set({ lastFetchedAt: new Date(), lastError: null })
    .where(eq(schema.jobSources.id, sourceId))
}

export async function recordFetchError(sourceId: string, errorMessage: string): Promise<void> {
  const db = getDb()
  await db.update(schema.jobSources)
    // Truncated — this is a short diagnostic string for the admin view, not
    // a place to accumulate full stack traces or (worse) job content.
    .set({ lastFetchedAt: new Date(), lastError: errorMessage.slice(0, 500) })
    .where(eq(schema.jobSources.id, sourceId))
}
