import { and, eq } from 'drizzle-orm'
import { getDb, schema } from './index'

export async function saveJobForUser(userId: string, jobId: string): Promise<void> {
  const db = getDb()
  await db.insert(schema.savedJobs).values({ userId, jobId }).onConflictDoNothing()
}

export async function unsaveJobForUser(userId: string, jobId: string): Promise<void> {
  const db = getDb()
  await db.delete(schema.savedJobs).where(and(eq(schema.savedJobs.userId, userId), eq(schema.savedJobs.jobId, jobId)))
}

export async function listSavedJobIds(userId: string): Promise<Set<string>> {
  const db = getDb()
  const rows = await db.select({ jobId: schema.savedJobs.jobId }).from(schema.savedJobs).where(eq(schema.savedJobs.userId, userId))
  return new Set(rows.map(r => r.jobId))
}
