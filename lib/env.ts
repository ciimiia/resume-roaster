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
}
