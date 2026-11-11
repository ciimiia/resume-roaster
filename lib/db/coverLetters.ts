import { eq, and, desc, sql } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { FabricationFlag } from '@/lib/tailoring/types'

export interface CoverLetterSummary {
  id: string
  preview: string // first 120 chars of the letter
  savedAt: string
}

export interface CoverLetterRecord {
  id: string
  userId: string
  letter: string
  tailoredResumeId: string | null
  jobId: string | null
  flags: FabricationFlag[]
  savedAt: string
}

function shortId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export async function saveCoverLetter(userId: string, letter: string): Promise<string> {
  const db = getDb()
  const id = shortId()
  await db.insert(schema.coverLetters).values({ id, userId, letter })
  return id
}

/** Phase 4 — a letter grounded in a specific tailored resume + job, with the anti-fabrication guard's flags attached. */
export async function saveTailoredCoverLetter(
  userId: string, letter: string, opts: { tailoredResumeId: string; jobId: string | null; flags: FabricationFlag[] }
): Promise<string> {
  const db = getDb()
  const id = shortId()
  await db.insert(schema.coverLetters).values({
    id, userId, letter,
    tailoredResumeId: opts.tailoredResumeId, jobId: opts.jobId, flags: opts.flags,
  })
  return id
}

/** Ownership-checked — returns null for a letter that doesn't exist OR belongs to someone else, same pattern as getResumeForUser. */
export async function getCoverLetterForUser(id: string, userId: string): Promise<CoverLetterRecord | null> {
  const db = getDb()
  const rows = await db.select().from(schema.coverLetters)
    .where(and(eq(schema.coverLetters.id, id), eq(schema.coverLetters.userId, userId))).limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id, userId: row.userId, letter: row.letter,
    tailoredResumeId: row.tailoredResumeId, jobId: row.jobId,
    flags: row.flags as FabricationFlag[], savedAt: row.savedAt.toISOString(),
  }
}

/** For the dashboard — most recent 50, newest first. */
export async function listCoverLettersForUser(userId: string): Promise<CoverLetterSummary[]> {
  const db = getDb()
  const rows = await db.select({
    id: schema.coverLetters.id,
    preview: sql<string>`left(${schema.coverLetters.letter}, 120)`,
    savedAt: schema.coverLetters.savedAt,
  })
    .from(schema.coverLetters)
    .where(eq(schema.coverLetters.userId, userId))
    .orderBy(desc(schema.coverLetters.savedAt))
    .limit(50)
  return rows.map(r => ({ id: r.id, preview: r.preview, savedAt: r.savedAt.toISOString() }))
}
