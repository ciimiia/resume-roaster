import { eq } from 'drizzle-orm'
import { getDb, schema } from './index'
import { ParsedProfileSchema, type ParsedProfile } from '@/lib/resumeProfile'

export interface ProfileRecord extends ParsedProfile {
  userId: string
  sourceResumeId: string | null
  approved: boolean
  updatedAt: string
}

function toRecord(row: typeof schema.profiles.$inferSelect): ProfileRecord {
  // Re-validate on the way out too, not just on the way in — a hand-edited
  // DB row or a future column-shape change shouldn't silently serve
  // malformed data to the UI. Throws if it's somehow invalid, which a
  // route handler should catch and turn into a 500, not swallow.
  const parsed = ParsedProfileSchema.parse({
    contact: row.contact,
    summary: row.summary,
    experience: row.experience,
    education: row.education,
    skills: row.skills,
    projects: row.projects,
    languages: row.languages,
    certifications: row.certifications,
  })
  return {
    ...parsed,
    userId: row.userId,
    sourceResumeId: row.sourceResumeId,
    approved: row.approved,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getProfileForUser(userId: string): Promise<ProfileRecord | null> {
  const db = getDb()
  const rows = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).limit(1)
  return rows[0] ? toRecord(rows[0]) : null
}

/** Upserts the user's single profile row. `approved` defaults to false — callers must opt in explicitly (e.g. the review screen's "approve" action). */
export async function saveProfileForUser(
  userId: string,
  profile: ParsedProfile,
  opts: { sourceResumeId?: string | null; approved: boolean }
): Promise<ProfileRecord> {
  const validated = ParsedProfileSchema.parse(profile) // never trust the caller blindly, even internal callers
  const db = getDb()
  const now = new Date()
  const rows = await db.insert(schema.profiles)
    .values({
      userId,
      sourceResumeId: opts.sourceResumeId ?? null,
      ...validated,
      approved: opts.approved,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: {
        sourceResumeId: opts.sourceResumeId ?? null,
        ...validated,
        approved: opts.approved,
        updatedAt: now,
      },
    })
    .returning()
  return toRecord(rows[0])
}

export async function deleteProfileForUser(userId: string): Promise<void> {
  const db = getDb()
  await db.delete(schema.profiles).where(eq(schema.profiles.userId, userId))
}
