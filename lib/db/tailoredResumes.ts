import { eq, and, desc } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { TailoredProfile, ChangeItem, FabricationFlag, AtsCoverage } from '@/lib/tailoring/types'

export interface TailoredResumeRecord {
  id: string
  userId: string
  jobId: string | null
  jobTextHash: string | null
  jobTitleSnapshot: string
  companySnapshot: string | null
  profileApprovedAt: string
  tailoredProfile: TailoredProfile
  changes: ChangeItem[]
  flags: FabricationFlag[]
  atsCoverage: AtsCoverage
  createdAt: string
}

function toRecord(row: typeof schema.tailoredResumes.$inferSelect): TailoredResumeRecord {
  return {
    id: row.id,
    userId: row.userId,
    jobId: row.jobId,
    jobTextHash: row.jobTextHash,
    jobTitleSnapshot: row.jobTitleSnapshot,
    companySnapshot: row.companySnapshot,
    profileApprovedAt: row.profileApprovedAt.toISOString(),
    tailoredProfile: row.tailoredProfile as TailoredProfile,
    changes: row.changes as ChangeItem[],
    flags: row.flags as FabricationFlag[],
    atsCoverage: row.atsCoverage as AtsCoverage,
    createdAt: row.createdAt.toISOString(),
  }
}

export interface CreateTailoredResumeInput {
  userId: string
  jobId: string | null
  jobTextHash: string | null
  jobTitleSnapshot: string
  companySnapshot: string | null
  profileApprovedAt: Date
  tailoredProfile: TailoredProfile
  changes: ChangeItem[]
  flags: FabricationFlag[]
  atsCoverage: AtsCoverage
}

export async function createTailoredResume(input: CreateTailoredResumeInput): Promise<TailoredResumeRecord> {
  const db = getDb()
  const rows = await db.insert(schema.tailoredResumes).values(input).returning()
  return toRecord(rows[0])
}

/** Ownership-checked — returns null for a record that doesn't exist OR belongs to someone else. */
export async function getTailoredResumeForUser(id: string, userId: string): Promise<TailoredResumeRecord | null> {
  const db = getDb()
  const rows = await db.select().from(schema.tailoredResumes)
    .where(and(eq(schema.tailoredResumes.id, id), eq(schema.tailoredResumes.userId, userId))).limit(1)
  return rows[0] ? toRecord(rows[0]) : null
}

/** Lets the user edit the tailored content (e.g. after reviewing flags) — ownership-checked, re-saves the given fields. */
export async function updateTailoredResumeForUser(
  id: string, userId: string, patch: { tailoredProfile: TailoredProfile; flags: FabricationFlag[]; atsCoverage: AtsCoverage }
): Promise<TailoredResumeRecord | null> {
  const db = getDb()
  const rows = await db.update(schema.tailoredResumes)
    .set({ tailoredProfile: patch.tailoredProfile, flags: patch.flags, atsCoverage: patch.atsCoverage })
    .where(and(eq(schema.tailoredResumes.id, id), eq(schema.tailoredResumes.userId, userId)))
    .returning()
  return rows[0] ? toRecord(rows[0]) : null
}

/** Deleting a tailored resume cascades (DB FK) to any cover letter generated from it — see schema.ts's coverLetters.tailoredResumeId. */
export async function deleteTailoredResumesForUser(userId: string): Promise<number> {
  const db = getDb()
  const rows = await db.delete(schema.tailoredResumes).where(eq(schema.tailoredResumes.userId, userId)).returning({ id: schema.tailoredResumes.id })
  return rows.length
}

export async function listTailoredResumesForUser(userId: string): Promise<TailoredResumeRecord[]> {
  const db = getDb()
  const rows = await db.select().from(schema.tailoredResumes)
    .where(eq(schema.tailoredResumes.userId, userId))
    .orderBy(desc(schema.tailoredResumes.createdAt))
    .limit(50)
  return rows.map(toRecord)
}
