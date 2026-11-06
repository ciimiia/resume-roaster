import { eq } from 'drizzle-orm'
import { getDb, schema } from './index'
import { ParsedProfileSchema, type ParsedProfile } from '@/lib/resumeProfile'

export interface ProfileRecord extends ParsedProfile {
  userId: string
  sourceResumeId: string | null
  approved: boolean
  approvedAt: string | null
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
    approvedAt: row.approvedAt?.toISOString() ?? null,
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
  // approvedAt is the "profile version" matching is cached/invalidated
  // against (see lib/db/schema.ts) — bumped every time this is an approval
  // (even re-approving unchanged content counts as a new version, per "stop
  // for review"'s re-embed-on-re-approval requirement), left untouched on
  // an unapproved draft save so matching keeps using the last approved
  // version while the user is mid-edit.
  const approvedAt = opts.approved ? now : undefined
  const rows = await db.insert(schema.profiles)
    .values({
      userId,
      sourceResumeId: opts.sourceResumeId ?? null,
      ...validated,
      approved: opts.approved,
      approvedAt: approvedAt ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: {
        sourceResumeId: opts.sourceResumeId ?? null,
        ...validated,
        approved: opts.approved,
        ...(approvedAt ? { approvedAt } : {}),
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

/** Sets the profile's embedding vector — called right after an approval, from the route handler (keeps the network call out of this db-only module). */
export async function setProfileEmbedding(userId: string, embedding: number[]): Promise<void> {
  const db = getDb()
  await db.update(schema.profiles)
    .set({ embedding, embeddingUpdatedAt: new Date() })
    .where(eq(schema.profiles.userId, userId))
}

export interface ProfileForMatching {
  userId: string
  approvedAt: string
  embedding: number[]
}

/** The current approved profile's embedding + version marker — null if unapproved, or approved but not yet embedded. */
export async function getApprovedProfileForMatching(userId: string): Promise<ProfileForMatching | null> {
  const db = getDb()
  const rows = await db.select({
    approved: schema.profiles.approved,
    approvedAt: schema.profiles.approvedAt,
    embedding: schema.profiles.embedding,
  }).from(schema.profiles).where(eq(schema.profiles.userId, userId)).limit(1)

  const row = rows[0]
  if (!row || !row.approved || !row.approvedAt || !row.embedding) return null
  return { userId, approvedAt: row.approvedAt.toISOString(), embedding: row.embedding }
}
