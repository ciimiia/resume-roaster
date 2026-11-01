import { eq } from 'drizzle-orm'
import { getDb, schema } from './index'
import { JobPreferencesSchema, type JobPreferences } from '@/lib/resumeProfile'

export interface JobPreferencesRecord extends JobPreferences {
  userId: string
  updatedAt: string
}

function toRecord(row: typeof schema.jobPreferences.$inferSelect): JobPreferencesRecord {
  const parsed = JobPreferencesSchema.parse({
    targetTitles: row.targetTitles,
    seniority: row.seniority ?? undefined,
    locations: row.locations,
    remoteType: row.remoteType,
    countries: row.countries,
    salaryMin: row.salaryMin ?? undefined,
    salaryMax: row.salaryMax ?? undefined,
    salaryCurrency: row.salaryCurrency ?? undefined,
    visaNeeds: row.visaNeeds ?? undefined,
    languages: row.languages,
  })
  return { ...parsed, userId: row.userId, updatedAt: row.updatedAt.toISOString() }
}

export async function getJobPreferencesForUser(userId: string): Promise<JobPreferencesRecord | null> {
  const db = getDb()
  const rows = await db.select().from(schema.jobPreferences).where(eq(schema.jobPreferences.userId, userId)).limit(1)
  return rows[0] ? toRecord(rows[0]) : null
}

export async function saveJobPreferencesForUser(userId: string, prefs: JobPreferences): Promise<JobPreferencesRecord> {
  const validated = JobPreferencesSchema.parse(prefs)
  const db = getDb()
  const now = new Date()
  const values = {
    userId,
    targetTitles: validated.targetTitles,
    seniority: validated.seniority ?? null,
    locations: validated.locations,
    remoteType: validated.remoteType,
    countries: validated.countries,
    salaryMin: validated.salaryMin ?? null,
    salaryMax: validated.salaryMax ?? null,
    salaryCurrency: validated.salaryCurrency ?? null,
    visaNeeds: validated.visaNeeds ?? null,
    languages: validated.languages,
    updatedAt: now,
  }
  const rows = await db.insert(schema.jobPreferences)
    .values(values)
    .onConflictDoUpdate({ target: schema.jobPreferences.userId, set: values })
    .returning()
  return toRecord(rows[0])
}

export async function deleteJobPreferencesForUser(userId: string): Promise<void> {
  const db = getDb()
  await db.delete(schema.jobPreferences).where(eq(schema.jobPreferences.userId, userId))
}
