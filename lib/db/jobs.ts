import { eq, and, lt, ne, isNull, or, inArray, sql, count } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { NormalizedJob } from '@/lib/jobIngestion/types'
import { computeContentHash } from '@/lib/jobIngestion/contentHash'

export interface UpsertResult {
  isNew: boolean
}

/**
 * Dedupe key is (source, sourceJobId) — see the unique index on `jobs`.
 * Always refreshes lastSeenAt/status so a job that reappears after being
 * marked expired comes back to 'active' automatically. contentHash is
 * recomputed and stored every time (cheap), even though nothing currently
 * reads "did this change" — it's there for the matching phase (2b) to diff
 * against later without re-fetching.
 */
export async function upsertJob(job: NormalizedJob): Promise<UpsertResult> {
  const db = getDb()
  const contentHash = computeContentHash(job)

  const existing = await db.select({ id: schema.jobs.id }).from(schema.jobs)
    .where(and(eq(schema.jobs.source, job.source), eq(schema.jobs.sourceJobId, job.sourceJobId)))
    .limit(1)
  const isNew = existing.length === 0

  await db.insert(schema.jobs).values({
    source: job.source,
    sourceJobId: job.sourceJobId,
    atsType: job.atsType,
    applyUrl: job.applyUrl,
    sourceUrl: job.sourceUrl,
    attributionLabel: job.attributionLabel,
    company: job.company,
    title: job.title,
    location: job.location,
    remoteType: job.remoteType,
    descriptionText: job.descriptionText,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPredicted: job.salaryPredicted,
    postedAt: job.postedAt,
    language: job.language,
    contentHash,
    status: 'active',
  }).onConflictDoUpdate({
    target: [schema.jobs.source, schema.jobs.sourceJobId],
    set: {
      atsType: job.atsType,
      applyUrl: job.applyUrl,
      sourceUrl: job.sourceUrl,
      attributionLabel: job.attributionLabel,
      company: job.company,
      title: job.title,
      location: job.location,
      remoteType: job.remoteType,
      descriptionText: job.descriptionText,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPredicted: job.salaryPredicted,
      postedAt: job.postedAt,
      language: job.language,
      contentHash,
      lastSeenAt: new Date(),
      status: 'active',
    },
  })

  return { isNew }
}

const BATCH_CHUNK_SIZE = 200

export interface BatchUpsertResult {
  jobCount: number
  newCount: number
}

/**
 * Bulk version of upsertJob for a whole source's fetch result — a company
 * board can return hundreds of jobs (Stripe's alone is 700+), and
 * upserting one row per round trip over Neon's HTTP driver was measured
 * taking the runner's entire time budget on a single large source. This
 * does one SELECT to find which sourceJobIds already exist, then a small
 * number of multi-row INSERT ... ON CONFLICT statements (chunked at
 * BATCH_CHUNK_SIZE rows) instead of one round trip per job.
 */
export async function upsertJobsBatch(jobs: NormalizedJob[]): Promise<BatchUpsertResult> {
  if (jobs.length === 0) return { jobCount: 0, newCount: 0 }
  const db = getDb()
  const source = jobs[0].source

  const existingIds = await db.select({ sourceJobId: schema.jobs.sourceJobId }).from(schema.jobs)
    .where(and(eq(schema.jobs.source, source), inArray(schema.jobs.sourceJobId, jobs.map(j => j.sourceJobId))))
  const existingSet = new Set(existingIds.map(r => r.sourceJobId))
  const newCount = jobs.filter(j => !existingSet.has(j.sourceJobId)).length

  const now = new Date()
  const rows = jobs.map(job => ({
    source: job.source,
    sourceJobId: job.sourceJobId,
    atsType: job.atsType,
    applyUrl: job.applyUrl,
    sourceUrl: job.sourceUrl,
    attributionLabel: job.attributionLabel,
    company: job.company,
    title: job.title,
    location: job.location,
    remoteType: job.remoteType,
    descriptionText: job.descriptionText,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPredicted: job.salaryPredicted,
    postedAt: job.postedAt,
    language: job.language,
    contentHash: computeContentHash(job),
    lastSeenAt: now,
    status: 'active' as const,
  }))

  for (let i = 0; i < rows.length; i += BATCH_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + BATCH_CHUNK_SIZE)
    await db.insert(schema.jobs).values(chunk).onConflictDoUpdate({
      target: [schema.jobs.source, schema.jobs.sourceJobId],
      set: {
        atsType: sql`excluded.ats_type`,
        applyUrl: sql`excluded.apply_url`,
        sourceUrl: sql`excluded.source_url`,
        attributionLabel: sql`excluded.attribution_label`,
        company: sql`excluded.company`,
        title: sql`excluded.title`,
        location: sql`excluded.location`,
        remoteType: sql`excluded.remote_type`,
        descriptionText: sql`excluded.description_text`,
        salaryMin: sql`excluded.salary_min`,
        salaryMax: sql`excluded.salary_max`,
        salaryCurrency: sql`excluded.salary_currency`,
        salaryPredicted: sql`excluded.salary_predicted`,
        postedAt: sql`excluded.posted_at`,
        language: sql`excluded.language`,
        contentHash: sql`excluded.content_hash`,
        lastSeenAt: sql`excluded.last_seen_at`,
        status: sql`excluded.status`,
      },
    })
  }

  return { jobCount: jobs.length, newCount }
}

/** Jobs not re-seen by any ingestion run in `days` days are marked expired — not deleted, so history/links stay valid. */
export async function expireStaleJobs(days: number): Promise<number> {
  const db = getDb()
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await db.update(schema.jobs)
    .set({ status: 'expired', expiresAt: new Date() })
    .where(and(eq(schema.jobs.status, 'active'), lt(schema.jobs.lastSeenAt, threshold)))
    .returning({ id: schema.jobs.id })
  return rows.length
}

export interface SourceCounts {
  source: string
  activeCount: number
}

export async function countActiveJobsBySource(): Promise<SourceCounts[]> {
  const db = getDb()
  const rows = await db.select({ source: schema.jobs.source, activeCount: count() })
    .from(schema.jobs)
    .where(eq(schema.jobs.status, 'active'))
    .groupBy(schema.jobs.source)
  return rows.map(r => ({ source: r.source, activeCount: Number(r.activeCount) }))
}

export interface JobListItem {
  id: string
  source: string
  company: string
  title: string
  location: string | null
  remoteType: string | null
  applyUrl: string
  sourceUrl: string
  attributionLabel: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPredicted: boolean
  postedAt: string | null
}

function toListItem(row: typeof schema.jobs.$inferSelect): JobListItem {
  return {
    id: row.id,
    source: row.source,
    company: row.company,
    title: row.title,
    location: row.location,
    remoteType: row.remoteType,
    applyUrl: row.applyUrl,
    sourceUrl: row.sourceUrl,
    attributionLabel: row.attributionLabel,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency,
    salaryPredicted: row.salaryPredicted,
    postedAt: row.postedAt?.toISOString() ?? null,
  }
}

export interface SearchJobsParams {
  q?: string
  remote?: 'remote' | 'hybrid' | 'onsite'
  country?: string
  page: number
  pageSize: number
}

/**
 * Basic Postgres full-text search (to_tsvector/to_tsquery at query time) —
 * no stored tsvector column or GIN index yet (dataset is small: dozens of
 * seeded companies). Add an indexed generated column if/when this needs to
 * scale past a few thousand rows.
 */
export async function searchJobs(params: SearchJobsParams): Promise<{ items: JobListItem[]; total: number }> {
  const db = getDb()
  const conditions = [eq(schema.jobs.status, 'active')]

  if (params.remote) {
    conditions.push(eq(schema.jobs.remoteType, params.remote))
  }
  if (params.country) {
    // Location is free-text from the source, not a normalized country
    // code — a simple substring match is the honest level of precision
    // available without a geocoding step.
    conditions.push(sql`${schema.jobs.location} ILIKE ${'%' + params.country + '%'}`)
  }

  let textCondition = sql`true`
  if (params.q && params.q.trim().length > 0) {
    textCondition = sql`to_tsvector('english', ${schema.jobs.title} || ' ' || ${schema.jobs.company} || ' ' || ${schema.jobs.descriptionText}) @@ plainto_tsquery('english', ${params.q.trim()})`
  }

  const whereClause = and(...conditions, textCondition)

  const offset = (params.page - 1) * params.pageSize
  const [rows, totalRows] = await Promise.all([
    db.select().from(schema.jobs).where(whereClause)
      .orderBy(sql`${schema.jobs.postedAt} DESC NULLS LAST`)
      .limit(params.pageSize).offset(offset),
    db.select({ count: count() }).from(schema.jobs).where(whereClause),
  ])

  return {
    items: rows.map(toListItem),
    total: Number(totalRows[0]?.count ?? 0),
  }
}

// ── Phase 2b: embeddings ─────────────────────────────────────────────────

export interface JobForEmbedding {
  id: string
  title: string
  company: string
  descriptionText: string
  contentHash: string
}

/** Text embedded for a job — title+company carry real signal for matching title/seniority, description is the bulk of it. */
export function buildJobEmbeddingText(job: Pick<JobForEmbedding, 'title' | 'company' | 'descriptionText'>): string {
  return `${job.title} at ${job.company}\n\n${job.descriptionText}`
}

/**
 * Active jobs that have never been embedded, or whose content changed
 * since their last embedding (contentHash vs. embeddingContentHash) —
 * see lib/db/schema.ts's jobs.embeddingContentHash comment. Ordered
 * oldest-first-seen so a backlog clears in FIFO order across cron ticks.
 */
export async function getJobsNeedingEmbedding(limit: number): Promise<JobForEmbedding[]> {
  const db = getDb()
  const rows = await db.select({
    id: schema.jobs.id,
    title: schema.jobs.title,
    company: schema.jobs.company,
    descriptionText: schema.jobs.descriptionText,
    contentHash: schema.jobs.contentHash,
  }).from(schema.jobs)
    .where(and(
      eq(schema.jobs.status, 'active'),
      or(isNull(schema.jobs.embeddingContentHash), ne(schema.jobs.embeddingContentHash, schema.jobs.contentHash)),
    ))
    .orderBy(schema.jobs.firstSeenAt)
    .limit(limit)
  return rows
}

export async function setJobEmbedding(jobId: string, embedding: number[], contentHash: string): Promise<void> {
  const db = getDb()
  await db.update(schema.jobs)
    .set({ embedding, embeddingContentHash: contentHash })
    .where(eq(schema.jobs.id, jobId))
}

// ── Phase 2b: admin removal ───────────────────────────────────────────────

/** Case-insensitive exact match on company name — used by the admin "block + purge" action (lib/db/blockedCompanies.ts handles preventing re-ingestion; this removes what's already there). */
export async function deleteJobsByCompany(company: string): Promise<number> {
  const db = getDb()
  const rows = await db.delete(schema.jobs)
    .where(sql`lower(${schema.jobs.company}) = lower(${company})`)
    .returning({ id: schema.jobs.id })
  return rows.length
}

export async function jobExists(jobId: string): Promise<boolean> {
  const db = getDb()
  const rows = await db.select({ id: schema.jobs.id }).from(schema.jobs).where(eq(schema.jobs.id, jobId)).limit(1)
  return rows.length > 0
}

export interface JobWithDescription extends JobListItem {
  descriptionText: string
}

/** Full job row including descriptionText — lib/db/jobs.ts's other reads (searchJobs, retrieveCandidateJobs) deliberately omit it from list responses to keep payloads small; the tailoring pipeline (Phase 4) is the one place that needs the full text. */
export async function getJobById(jobId: string): Promise<JobWithDescription | null> {
  const db = getDb()
  const rows = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).limit(1)
  const row = rows[0]
  if (!row) return null
  return { ...toListItem(row), descriptionText: row.descriptionText }
}

export async function deleteJobsBySource(source: string): Promise<number> {
  const db = getDb()
  const rows = await db.delete(schema.jobs).where(eq(schema.jobs.source, source)).returning({ id: schema.jobs.id })
  return rows.length
}
