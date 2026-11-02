import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDb, schema } from './index'

// `excluded.<col>` references for the batch upsert below — same pattern as
// lib/db/jobs.ts's upsertJobsBatch.
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`)
}

export interface MatchDetails {
  matchScore: number
  strengths: string[]
  gaps: string[]
  missingKeywords: string[]
  recommendation: string
}

export interface CachedMatch extends MatchDetails {
  jobId: string
}

/**
 * Cached re-rank results for a set of jobs, but only the ones whose cached
 * profileApprovedAt matches the given version — a row cached against an
 * older profile version is treated as absent (the caller re-ranks it),
 * which is how "invalidate when the profile changes" works: no separate
 * invalidation pass needed, staleness is just "doesn't match on read".
 */
export async function getCachedMatches(userId: string, jobIds: string[], profileApprovedAt: Date): Promise<Map<string, CachedMatch>> {
  if (jobIds.length === 0) return new Map()
  const db = getDb()
  const rows = await db.select().from(schema.jobMatches)
    .where(and(
      eq(schema.jobMatches.userId, userId),
      inArray(schema.jobMatches.jobId, jobIds),
      eq(schema.jobMatches.profileApprovedAt, profileApprovedAt),
    ))
  return new Map(rows.map(r => [r.jobId, {
    jobId: r.jobId,
    matchScore: r.matchScore,
    strengths: r.strengths as string[],
    gaps: r.gaps as string[],
    missingKeywords: r.missingKeywords as string[],
    recommendation: r.recommendation,
  }]))
}

export async function upsertMatches(userId: string, profileApprovedAt: Date, matches: CachedMatch[]): Promise<void> {
  if (matches.length === 0) return
  const db = getDb()
  const rows = matches.map(m => ({
    userId,
    jobId: m.jobId,
    profileApprovedAt,
    matchScore: m.matchScore,
    strengths: m.strengths,
    gaps: m.gaps,
    missingKeywords: m.missingKeywords,
    recommendation: m.recommendation,
  }))
  await db.insert(schema.jobMatches).values(rows).onConflictDoUpdate({
    target: [schema.jobMatches.userId, schema.jobMatches.jobId],
    set: {
      profileApprovedAt: sqlExcluded('profile_approved_at'),
      matchScore: sqlExcluded('match_score'),
      strengths: sqlExcluded('strengths'),
      gaps: sqlExcluded('gaps'),
      missingKeywords: sqlExcluded('missing_keywords'),
      recommendation: sqlExcluded('recommendation'),
    },
  })
}
