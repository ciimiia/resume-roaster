/**
 * Centralized, validated environment access.
 *
 * Import `env` instead of reading `process.env.X` directly. Each getter
 * validates lazily (on first access, not at module load) so that an
 * unconfigured optional feature doesn't crash routes that never touch it —
 * but the moment something *does* need it, the error names exactly which
 * var is missing and how to set it, instead of a vague downstream crash.
 *
 * Required-at-boot vars (ones the whole app needs, like SESSION_SECRET) are
 * still validated lazily here rather than eagerly at import time, because
 * this module is imported from both Node and Edge runtimes (middleware) and
 * eager `process.env` reads can behave inconsistently across them in Next.js.
 */

import { z } from 'zod'

function readOptional(name: string): string | undefined {
  const v = process.env[name]
  return v && v.length > 0 ? v : undefined
}

function requireVar(name: string, hint: string): string {
  const v = readOptional(name)
  if (!v) {
    throw new Error(
      `[env] Missing required environment variable "${name}". ${hint}\n` +
      `Set it in .env.local for development, or in your Vercel project's Environment Variables for deploys.`
    )
  }
  return v
}

const urlSchema = z.string().url()

export const env = {
  /** Base URL of this deployment, e.g. https://resume-roaster-tan-six.vercel.app */
  get siteUrl(): string {
    const raw = readOptional('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000'
    const parsed = urlSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`[env] NEXT_PUBLIC_SITE_URL is set but not a valid URL: "${raw}"`)
    }
    return parsed.data.replace(/\/$/, '')
  },

  /**
   * Shows the homepage's "AI-matched jobs" banner/footer link. Default
   * OFF — until a real ingestion run has populated the `jobs` table (see
   * lib/jobIngestion/runner.ts), the feature it points to has nothing to
   * show, so advertising it to anonymous visitors would be misleading.
   * Flip on via NEXT_PUBLIC_SHOW_JOBS_BANNER=true once jobs exist.
   */
  get showJobsBanner(): boolean {
    return readOptional('NEXT_PUBLIC_SHOW_JOBS_BANNER') === 'true'
  },

  get sessionSecret(): string {
    return requireVar('SESSION_SECRET', 'Used to sign session cookies. Generate one with `openssl rand -hex 32`.')
  },

  get adminEmails(): string[] {
    return (readOptional('ADMIN_EMAILS') ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  },

  /** True if the given email is listed in ADMIN_EMAILS (case-insensitive). */
  isAdminEmail(email: string): boolean {
    return this.adminEmails.includes(email.trim().toLowerCase())
  },

  get cronSecret(): string | undefined {
    return readOptional('CRON_SECRET')
  },

  // ── Adzuna job search API — Phase 2a, optional ──────────────────────────
  // Commercial/revenue-generating use requires a separate Adzuna licence
  // agreement beyond just registering for a free app_id/app_key — see
  // lib/jobIngestion/adapters/adzuna.ts. Both vars must be set for the
  // adapter to run at all; it's skipped cleanly (not an error) otherwise.
  get adzunaAppId(): string | undefined {
    return readOptional('ADZUNA_APP_ID')
  },
  get adzunaAppKey(): string | undefined {
    return readOptional('ADZUNA_APP_KEY')
  },
  get hasAdzuna(): boolean {
    return readOptional('ADZUNA_APP_ID') !== undefined && readOptional('ADZUNA_APP_KEY') !== undefined
  },

  get openRouterApiKey(): string | undefined {
    return readOptional('OPENROUTER_API_KEY')
  },

  /**
   * Model used for both resume parsing and roast analysis. Defaults to a
   * low-cost paid model with reliable JSON output — NOT `openrouter/free`,
   * which routes to whatever free model is available and can't be paired
   * with a `data_collection: "deny"` provider preference (free models are
   * free precisely because the provider retains/trains on prompts; "deny"
   * would leave no route and the request would fail). See
   * lib/resumeParsing.ts and app/api/analyze/route.ts for where this is used.
   */
  get openRouterModel(): string {
    return readOptional('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini'
  },

  /**
   * Model used for job/profile embeddings (Phase 2b). Confirmed OpenRouter's
   * embeddings endpoint (POST /api/v1/embeddings) accepts the same
   * `provider: { data_collection: "deny" }` routing constraint as chat
   * completions — see lib/embeddings.ts. Default is
   * openai/text-embedding-3-small: 1536 dimensions (matches the `vector`
   * columns in lib/db/schema.ts — changing this to a model with a
   * different dimension count requires a new migration), $0.02/1M tokens.
   */
  get embeddingModel(): string {
    return readOptional('EMBEDDING_MODEL') ?? 'openai/text-embedding-3-small'
  },

  /** Model used for the job-match LLM re-rank step (Phase 2b). Same privacy constraint as openRouterModel — must be a paid model, routed with data_collection deny. */
  get rerankModel(): string {
    return readOptional('RERANK_MODEL') ?? this.openRouterModel
  },

  /** Model used for resume tailoring (Phase 4) — same data_collection:deny constraint. */
  get tailorModel(): string {
    return readOptional('TAILOR_MODEL') ?? this.openRouterModel
  },

  /** Model used for the tailored cover letter generator (Phase 4) — same data_collection:deny constraint. */
  get tailorCoverLetterModel(): string {
    return readOptional('TAILOR_COVER_LETTER_MODEL') ?? this.openRouterModel
  },

  // ── Postgres (Neon) — primary data store as of Phase 1 ─────────────────────
  get databaseUrl(): string {
    return requireVar(
      'DATABASE_URL',
      'Create the Neon database from the Vercel dashboard (Storage → Neon), then run `vercel env pull` ' +
      'to populate .env.local, or set it manually to the Neon connection string.'
    )
  },
  get hasDatabase(): boolean {
    return readOptional('DATABASE_URL') !== undefined
  },

  // ── Vercel Blob — Phase 0 scaffold; not required until a route uses storage ──
  get blobReadWriteToken(): string {
    return requireVar(
      'BLOB_READ_WRITE_TOKEN',
      'Create a Vercel Blob store from the Vercel dashboard (Storage → Blob), then run `vercel env pull`.'
    )
  },
  get hasBlobStorage(): boolean {
    return readOptional('BLOB_READ_WRITE_TOKEN') !== undefined
  },

  // ── Email (password reset) — launch-readiness, optional ─────────────────
  // Behind one env var so the whole feature fails closed (hidden in the UI,
  // 404 from the API) rather than erroring if unset — see lib/email.ts.
  get resendApiKey(): string | undefined {
    return readOptional('RESEND_API_KEY')
  },
  get hasEmailProvider(): boolean {
    return readOptional('RESEND_API_KEY') !== undefined
  },
  /** Verified sending address — Resend requires a verified domain for anything beyond their sandbox onboarding@resend.dev address. */
  get emailFrom(): string {
    return readOptional('EMAIL_FROM') ?? 'onboarding@resend.dev'
  },

  // ── Legal / contact (launch-readiness) ──────────────────────────────────
  // NEXT_PUBLIC_ (not a secret) — /privacy and /terms are rendered
  // client-side to match this app's lang-toggle pattern (lib/LangContext.tsx,
  // no server-side locale routing), so this needs to be readable there too.
  /** Shown on /privacy and /terms as the contact address for data requests. */
  get contactEmail(): string {
    return readOptional('NEXT_PUBLIC_CONTACT_EMAIL') ?? 'support@example.com'
  },
}
