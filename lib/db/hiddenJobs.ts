import { and, eq } from 'drizzle-orm'
import { getDb, schema } from './index'

export async function hideJobForUser(userId: string, jobId: string): Promise<void> {
  const db = getDb()
  await db.insert(schema.hiddenJobs).values({ userId, jobId }).onConflictDoNothing()
}

export async function unhideJobForUser(userId: string, jobId: string): Promise<void> {
  const db = getDb()
  await db.delete(schema.hiddenJobs).where(and(eq(schema.hiddenJobs.userId, userId), eq(schema.hiddenJobs.jobId, jobId)))
}

export async function listHiddenJobIds(userId: string): Promise<Set<string>> {
  const db = getDb()
  const rows = await db.select({ jobId: schema.hiddenJobs.jobId }).from(schema.hiddenJobs).where(eq(schema.hiddenJobs.userId, userId))
  return new Set(rows.map(r => r.jobId))
}
