/**
 * Drizzle schema — Phase 1 step 1a: migrated off Upstash KV (dead host,
 * see ARCHITECTURE.md) onto Postgres/Neon. Replaces every KV key pattern
 * audited in PHASE_1_KV_AUDIT.md; see that doc for the KV→table mapping
 * and the handful of places this consolidates what used to be 2+ KV keys
 * into one normalized table.
 *
 * Sessions stay as stateless HMAC-signed cookies (lib/session.ts) — the
 * existing design never looked sessions up server-side, so there's
 * nothing to migrate there; no sessions table.
 */

import { pgTable, text, timestamp, integer, jsonb, uuid, date, boolean, primaryKey, index, uniqueIndex, vector } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// text-embedding-3-small (see lib/embeddings.ts) — hardcoded here rather
// than imported from lib/embeddings.ts to keep the schema module free of
// any dependency on env/fetch-touching code.
const EMBEDDING_DIMENSIONS = 1536

// ── Phase 0 placeholder — kept until something in Phase 1+ needs the
// pipeline proven again, delete whenever ──────────────────────────────────
export const healthChecks = pgTable('health_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  note: text('note').notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Users (was user:email:*, user:id:*, users:all) ─────────────────────────
// Email uniqueness is case-insensitive by convention, not a DB constraint:
// every write/read path normalizes with .toLowerCase() first (see
// lib/db/users.ts), so the plain UNIQUE constraint below is sufficient and
// avoids a citext extension dependency. Don't insert/query this table with
// a non-lowercased email — go through lib/db/users.ts, not raw queries.
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Shared roast results (was result:{id} + user:analyses:{userId}) ────────
// Consolidated: the old "AnalysisSummary" written to user:analyses:* was
// just {id, mode, score, grade, verdict, savedAt} — a strict subset of the
// `result` JSON already stored under result:{id}. One table serves both the
// public /r/[id] share page and the dashboard's "my analyses" list (filtered
// by userId, which is null for anonymous shares).
//
// TTL: KV's `result:{id}` had a 90-day expiry. Postgres doesn't auto-expire
// rows, so `expiresAt` is enforced at read time (lib/db/results.ts treats
// an expired row as not-found) — physical deletion of expired rows isn't
// wired up yet (no cleanup cron). Flagging this rather than leaving it
// silent: unbounded table growth until that's added.
export const sharedResults = pgTable('shared_results', {
  // Kept as text, not uuid: existing share links are /r/{8-char-id}
  // (crypto.randomUUID().slice(0,8)) and changing the id format would
  // break any link already shared.
  id: text('id').primaryKey(),
  mode: text('mode').notNull(),
  result: jsonb('result').notNull(), // full AnalysisResult
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  // Phase 1b: which uploaded resume (if any) this roast was run against.
  // Nullable — the anonymous ad-hoc "upload a PDF and roast it" flow never
  // creates a `resumes` row, so most roasts will have no link here; this is
  // populated only when a signed-in user roasts a resume they uploaded
  // through the candidate-profile flow. onDelete 'set null' (not cascade):
  // deleting a resume shouldn't delete roasts that referenced it, just
  // un-link them.
  resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => ({
  userIdx: index('shared_results_user_idx').on(t.userId),
}))

// ── Cover letters (was coverletter:{id} + user:coverletters:{userId}) ──────
// Same consolidation as above — the old per-user summary list was a subset
// of the full letter record. `preview` (first 120 chars, shown on the
// dashboard) is derived at query time via SQL `left(letter, 120)` instead
// of being stored redundantly.
export const coverLetters = pgTable('cover_letters', {
  id: text('id').primaryKey(), // same short-id convention as sharedResults
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  letter: text('letter').notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('cover_letters_user_idx').on(t.userId),
}))

// ── Blog posts (was blog:posts:all + blog:post:{slug}) ──────────────────────
// Only AI-generated posts live here — the 3 hand-written posts stay in
// lib/posts.ts as static data, exactly like before (KV never stored those
// either). The old blog:posts:all ordered-slug-list is gone: ordering and
// "which slugs exist" both come from normal SQL (ORDER BY, primary key)
// instead of a hand-maintained index list that could drift out of sync.
export const blogPosts = pgTable('blog_posts', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  titleFa: text('title_fa'),
  excerpt: text('excerpt').notNull(),
  excerptFa: text('excerpt_fa'),
  date: date('date').notNull(),
  readTime: integer('read_time').notNull(),
  tag: text('tag').notNull(),
  content: jsonb('content').notNull(), // Block[]
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Site content overrides (was site:content) ────────────────────────────
// Generalized to a key→JSON settings table (not just one hardcoded row) so
// a future named settings blob doesn't need a schema change. Today only the
// 'site:content' key is used, keeping the same admin-editable-JSON-blob
// semantics KV had.
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Page visit stats (was stats:visits:{date}, stats:page:{path}:{date},
// stats:pages-list:{date}) ──────────────────────────────────────────────
// One row per (date, path) with an atomic counter, upserted via
// `ON CONFLICT ... DO UPDATE SET count = count + 1` — this also fixes a
// latent bug in the KV version: `get` then `set` with +1 is a read-modify-
// write race under concurrent requests (two visits in the same instant
// could both read count=5 and both write count=6, losing one). Postgres's
// atomic increment doesn't have that race.
// Daily totals and per-day page lists are both now plain SQL (SUM / DISTINCT
// path) instead of separately maintained KV keys that could drift.
export const pageVisits = pgTable('page_visits', {
  date: date('date').notNull(),
  path: text('path').notNull(),
  count: integer('count').notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.date, t.path] }),
}))

// ── Rate limiting (new — nothing existed in KV for this) ─────────────────
// Fixed-window counter, keyed by whatever the caller chooses (e.g.
// `signup:email:<normalized email>`, `signin:email:<normalized email>`).
// See lib/rateLimit.ts for the check-and-increment helper built on this.
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(1),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().default(sql`now()`),
})

// ── Phase 1b: candidate profile ─────────────────────────────────────────

// Upload history — one row per uploaded file. `parsedProfile` is the raw
// LLM extraction output for THIS version (zod-validated ParsedProfile
// shape, see lib/resumeProfile.ts), kept even after the user edits things
// in the review screen — `profiles` below holds the current edited/
// approved version; this table is the immutable upload+parse history.
// `filePathname` is a Vercel Blob pathname (private access), never a URL —
// see lib/storage.ts. The file itself is NOT deleted when a newer version
// is uploaded; "delete my data" removes all of a user's resume rows and
// their files together.
export const resumes = pgTable('resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filePathname: text('file_pathname').notNull(),
  originalFilename: text('original_filename').notNull(),
  fileSize: integer('file_size').notNull(),
  contentType: text('content_type').notNull(),
  // Null until parsing completes (or if it failed) — upload and parse are
  // two steps, not guaranteed atomic (the LLM call can fail independently
  // of the upload succeeding).
  parsedProfile: jsonb('parsed_profile'),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('resumes_user_idx').on(t.userId),
}))

// The user's current, approved structured profile — the single source of
// truth for later tailoring (Phase 4). One row per user (userId is the
// primary key, not a separate uuid): there's only ever one "current"
// profile, even though `resumes` keeps full upload history. Starts
// unapproved (approved=false) the moment parsing produces a profile;
// becomes approved only when the user explicitly confirms it on the
// review screen, per "the approved profile is the single source of truth".
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  sourceResumeId: uuid('source_resume_id').references(() => resumes.id, { onDelete: 'set null' }),
  contact: jsonb('contact').notNull(),
  summary: text('summary').notNull().default(''),
  experience: jsonb('experience').notNull().default([]),
  education: jsonb('education').notNull().default([]),
  skills: jsonb('skills').notNull().default([]),
  projects: jsonb('projects').notNull().default([]),
  languages: jsonb('languages').notNull().default([]),
  certifications: jsonb('certifications').notNull().default([]),
  approved: boolean('approved').notNull().default(false),
  // Bumped every time the user (re-)approves — this, not updatedAt (which
  // also changes on unapproved edits), is the "profile version" that job
  // match scores are cached against and invalidated by. See
  // lib/db/jobMatches.ts and lib/matching/.
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  embeddingUpdatedAt: timestamp('embedding_updated_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Phase 2a: job ingestion ──────────────────────────────────────────────

// One row per company/board we pull from. For the per-company ATS adapters
// (Greenhouse/Lever/Ashby) this is literally one employer's public board;
// for the aggregator adapters (Remotive, Arbeitnow, Adzuna) there's a
// single synthetic row per adapter (boardToken null) since those aren't
// scoped to one company. `enabled` lets us turn off a board without
// deleting its history; `lastError` is the ingestion runner's per-source
// error isolation surfacing to the admin view (see lib/jobIngestion/runner.ts).
export const jobSources = pgTable('job_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  atsType: text('ats_type').notNull(), // 'greenhouse' | 'lever' | 'ashby' | 'remotive' | 'arbeitnow' | 'adzuna'
  boardToken: text('board_token'), // company's board slug; null for aggregator-wide sources
  companyName: text('company_name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // NULLs are distinct in a unique index by default in Postgres, so this
  // only enforces uniqueness for the per-company rows (boardToken set);
  // aggregator sources are kept unique by convention (one row per atsType),
  // not by this DB constraint, since boardToken is null for all of them.
  atsBoardIdx: uniqueIndex('job_sources_ats_board_idx').on(t.atsType, t.boardToken),
}))

// One row per job listing, deduped by (source, sourceJobId). Job text is
// UNTRUSTED DATA from third-party employers — descriptionText is always the
// sanitized plain-text output of lib/jobIngestion/sanitizeHtml.ts, never
// raw HTML, and nothing here is ever executed, templated, or fed back as an
// LLM instruction (see lib/jobIngestion/ for the ingestion pipeline).
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Which adapter produced this row — see lib/jobIngestion/types.ts's
  // JobSourceId. For Adzuna-sourced rows that point at an underlying ATS,
  // `atsType` records that underlying system (e.g. 'greenhouse') while
  // `source` stays 'adzuna' — they're deliberately separate fields.
  source: text('source').notNull(),
  sourceJobId: text('source_job_id').notNull(),
  atsType: text('ats_type'),
  applyUrl: text('apply_url').notNull(),
  // Canonical link back to the original listing — required for attribution
  // on sources that mandate it (e.g. Adzuna's "Jobs by Adzuna" linking
  // requirement; see lib/jobIngestion/adapters/adzuna.ts).
  sourceUrl: text('source_url').notNull(),
  attributionLabel: text('attribution_label'), // e.g. "Jobs by Adzuna", null where not required
  company: text('company').notNull(),
  title: text('title').notNull(),
  location: text('location'),
  remoteType: text('remote_type'), // best-effort 'remote' | 'hybrid' | 'onsite' | null (unknown)
  descriptionText: text('description_text').notNull(),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency'),
  // True when the source itself flagged the salary as an estimate/model
  // prediction rather than employer-provided (e.g. Adzuna's predicted-salary
  // field) — surfaced so the UI can caveat it instead of presenting it as fact.
  salaryPredicted: boolean('salary_predicted').notNull().default(false),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  language: text('language'),
  // sha256 of normalized (title+company+location+descriptionText) — lets
  // the ingestion runner detect "this exact posting changed" vs. just
  // "still present, nothing changed" without diffing full text every run.
  contentHash: text('content_hash').notNull(),
  // Phase 2b: embedding of (title+company+descriptionText), plus the
  // contentHash it was computed from — the embedding cron re-embeds a job
  // only when embeddingContentHash doesn't match the current contentHash
  // (new job, or re-ingested with changed text), not every run.
  embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  embeddingContentHash: text('embedding_content_hash'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  status: text('status').notNull().default('active'), // 'active' | 'expired'
}, (t) => ({
  uniqueSourceJob: uniqueIndex('jobs_source_job_unique_idx').on(t.source, t.sourceJobId),
  statusIdx: index('jobs_status_idx').on(t.status),
}))

// One row per user — target roles, locations, remote preference, etc.
export const jobPreferences = pgTable('job_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  targetTitles: jsonb('target_titles').notNull().default([]),
  seniority: text('seniority'),
  locations: jsonb('locations').notNull().default([]),
  remoteType: jsonb('remote_type').notNull().default([]), // string[] subset of ('remote'|'hybrid'|'onsite')
  countries: jsonb('countries').notNull().default([]),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency'),
  visaNeeds: text('visa_needs'),
  languages: jsonb('languages').notNull().default([]),
  // Companies this user never wants to see, regardless of match score —
  // separate from the admin-wide `blockedCompanies` table below (that one
  // hides a company for everyone, this one is per-user).
  excludedCompanies: jsonb('excluded_companies').notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Phase 2b: matching ───────────────────────────────────────────────────

// Admin-managed, site-wide: a company on this list is excluded from
// ingestion (the runner skips/removes its jobs) and from match results for
// everyone, regardless of per-user preferences. Matched case-insensitively
// against jobs.company — see lib/db/blockedCompanies.ts.
export const blockedCompanies = pgTable('blocked_companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  normalizedIdx: uniqueIndex('blocked_companies_normalized_idx').on(t.normalizedName),
}))

// LLM re-rank result cache, keyed by (userId, jobId) — one row per pair,
// overwritten on recompute rather than versioned by row, with
// profileApprovedAt recording which profile version produced it. A cached
// row is considered stale (and recomputed) the moment it doesn't match the
// user's current profiles.approvedAt — see lib/matching/rerank.ts.
export const jobMatches = pgTable('job_matches', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  profileApprovedAt: timestamp('profile_approved_at', { withTimezone: true }).notNull(),
  matchScore: integer('match_score').notNull(),
  strengths: jsonb('strengths').notNull().default([]),
  gaps: jsonb('gaps').notNull().default([]),
  missingKeywords: jsonb('missing_keywords').notNull().default([]),
  recommendation: text('recommendation').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.jobId] }),
}))

export const savedJobs = pgTable('saved_jobs', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.jobId] }),
}))

export const hiddenJobs = pgTable('hidden_jobs', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  hiddenAt: timestamp('hidden_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.jobId] }),
}))
