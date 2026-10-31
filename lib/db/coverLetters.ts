import { eq, desc, sql } from 'drizzle-orm'
import { getDb, schema } from './index'

export interface CoverLetterSummary {
  id: string
  preview: string // first 120 chars of the letter
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
