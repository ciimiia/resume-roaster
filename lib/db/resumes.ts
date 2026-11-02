import { eq, and, desc, max } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { ParsedProfile } from '@/lib/resumeProfile'

export interface ResumeRecord {
  id: string
  userId: string
  filePathname: string
  originalFilename: string
  fileSize: number
  contentType: string
  parsedProfile: ParsedProfile | null
  version: number
  createdAt: string
}

function toRecord(row: typeof schema.resumes.$inferSelect): ResumeRecord {
  return {
    id: row.id,
    userId: row.userId,
    filePathname: row.filePathname,
    originalFilename: row.originalFilename,
    fileSize: row.fileSize,
    contentType: row.contentType,
    parsedProfile: row.parsedProfile as ParsedProfile | null,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function createResume(
  userId: string,
  file: { filePathname: string; originalFilename: string; fileSize: number; contentType: string }
): Promise<ResumeRecord> {
  const db = getDb()
  const [{ maxVersion }] = await db
    .select({ maxVersion: max(schema.resumes.version) })
    .from(schema.resumes)
    .where(eq(schema.resumes.userId, userId))
  const version = (maxVersion ?? 0) + 1

  const rows = await db.insert(schema.resumes).values({ userId, version, ...file }).returning()
  return toRecord(rows[0])
}

export async function setParsedProfile(resumeId: string, parsedProfile: ParsedProfile): Promise<void> {
  const db = getDb()
  await db.update(schema.resumes).set({ parsedProfile }).where(eq(schema.resumes.id, resumeId))
}

/** Ownership-checked fetch — returns null if the resume doesn't exist OR belongs to a different user. Prefer this over a bare getResumeById in any route. */
export async function getResumeForUser(id: string, userId: string): Promise<ResumeRecord | null> {
  const db = getDb()
  const rows = await db.select().from(schema.resumes)
    .where(and(eq(schema.resumes.id, id), eq(schema.resumes.userId, userId)))
    .limit(1)
  return rows[0] ? toRecord(rows[0]) : null
}

export async function listResumesForUser(userId: string): Promise<ResumeRecord[]> {
  const db = getDb()
  const rows = await db.select().from(schema.resumes)
    .where(eq(schema.resumes.userId, userId))
    .orderBy(desc(schema.resumes.version))
  return rows.map(toRecord)
}

export async function getLatestResumeForUser(userId: string): Promise<ResumeRecord | null> {
  const rows = await listResumesForUser(userId)
  return rows[0] ?? null
}

/** Ownership-checked delete. Returns the deleted row's filePathname (caller must also delete it from Blob) or null if nothing matched (not found / not owned). */
export async function deleteResumeForUser(id: string, userId: string): Promise<string | null> {
  const db = getDb()
  const rows = await db.delete(schema.resumes)
    .where(and(eq(schema.resumes.id, id), eq(schema.resumes.userId, userId)))
    .returning({ filePathname: schema.resumes.filePathname })
  return rows[0]?.filePathname ?? null
}

/** For "delete my data" — deletes every resume row for a user and returns all their file pathnames so the caller can clean up Blob storage too. */
export async function deleteAllResumesForUser(userId: string): Promise<string[]> {
  const db = getDb()
  const rows = await db.delete(schema.resumes)
    .where(eq(schema.resumes.userId, userId))
    .returning({ filePathname: schema.resumes.filePathname })
  return rows.map(r => r.filePathname)
}
