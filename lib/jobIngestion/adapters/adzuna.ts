/**
 * Adzuna's official job search API — https://developer.adzuna.com/docs/terms_of_service
 * GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?app_id=...&app_key=...
 *
 * Requires ADZUNA_APP_ID + ADZUNA_APP_KEY env vars — skipped cleanly (not
 * an error) if either is missing. Tell the user when they need to add
 * these: register at https://developer.adzuna.com to get a free app_id/key.
 *
 * ** Commercial-use note (confirmed from Adzuna's ToS text): ** "Any use
 * generating revenue or leads requires a licence agreement" — a free
 * app_id/app_key alone does not authorize commercial use in a revenue-
 * generating product. A 14-day evaluation trial is granted, after which
 * production commercial use needs a separate agreement with Adzuna. Treat
 * the free key as evaluation-only until that's in place.
 *
 * Attribution (confirmed from ToS): every displayed listing must carry an
 * "Adzuna" label (min 116x23px) hyperlinked to Adzuna's relevant local
 * domain — `attributionLabel` below carries that requirement as data; the
 * UI layer rendering these jobs is responsible for the actual linked badge.
 *
 * Redirect-to-ATS: Adzuna's `redirect_url` points at the original employer
 * listing, and `description` here is only an excerpt. This adapter does
 * NOT follow that redirect to fetch full text — Adzuna's ToS doesn't
 * address that explicitly either way, so it's treated as not permitted
 * absent written confirmation. Only the excerpt is stored.
 *
 * Rate limits: not fixed in the ToS text itself — it says limits are shown
 * in your Adzuna account dashboard and "may change at any time." Do not
 * hard-code an assumed limit; check the dashboard after registering.
 */
import type { JobSourceAdapter, NormalizedJob } from '../types'
import { fetchJson } from '../httpFetch'
import { sanitizeJobDescription } from '../sanitizeHtml'
import { env } from '@/lib/env'

interface AdzunaResult {
  id: string
  title: string
  description?: string
  redirect_url: string
  company?: { display_name?: string }
  location?: { display_name?: string }
  salary_min?: number
  salary_max?: number
  salary_is_predicted?: string | number
  created?: string
}

interface AdzunaResponse {
  results: AdzunaResult[]
}

// Adzuna requires a two-letter country code in the URL path, not a query
// param. 'us' covers the broadest listing volume for a first pass; this
// can be made configurable per job_sources row later if we add per-country
// Adzuna sources.
const DEFAULT_COUNTRY = 'us'

export const adzunaAdapter: JobSourceAdapter = {
  id: 'adzuna',
  // No boardToken to use — Adzuna is configured globally via env vars,
  // not per job_sources row, so the config param is intentionally unused.
  async fetchJobs() {
    if (!env.hasAdzuna) return { jobs: [] } // not configured — skip cleanly, not an error

    const url = `https://api.adzuna.com/v1/api/jobs/${DEFAULT_COUNTRY}/search/1` +
      `?app_id=${encodeURIComponent(env.adzunaAppId!)}&app_key=${encodeURIComponent(env.adzunaAppKey!)}` +
      `&results_per_page=20&content-type=application/json`

    const result = await fetchJson<AdzunaResponse>(url)
    if (!result.ok || !result.data) {
      throw new Error(`adzuna fetch failed: HTTP ${result.status}`)
    }

    const jobs: NormalizedJob[] = (result.data.results ?? []).map((r) => ({
      source: 'adzuna',
      sourceJobId: r.id,
      atsType: null,
      applyUrl: r.redirect_url,
      sourceUrl: r.redirect_url,
      attributionLabel: 'Jobs by Adzuna', // required attribution per Adzuna's ToS
      company: r.company?.display_name ?? 'Unknown',
      title: r.title,
      location: r.location?.display_name ?? null,
      remoteType: null, // Adzuna doesn't reliably flag remote in the base response
      descriptionText: sanitizeJobDescription(r.description), // excerpt only — see file header
      salaryMin: r.salary_min ? Math.round(r.salary_min) : null,
      salaryMax: r.salary_max ? Math.round(r.salary_max) : null,
      salaryCurrency: null, // Adzuna's search endpoint doesn't return currency directly; left null rather than guessed
      salaryPredicted: r.salary_is_predicted === '1' || r.salary_is_predicted === 1,
      postedAt: r.created ? new Date(r.created) : null,
      language: null,
    }))

    return { jobs }
  },
}
