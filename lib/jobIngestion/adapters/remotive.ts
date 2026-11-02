/**
 * Remotive's public API — https://github.com/remotive-com/remote-jobs-api
 * GET https://remotive.com/api/remote-jobs
 *
 * ** NOT enabled by default — see the compliance note below. **
 *
 * Remotive's own README (confirmed primary source) requires attribution
 * (must name Remotive and link back to the job's Remotive URL) and caps
 * fetch frequency hard: ~4 requests/day recommended, >2/minute gets you
 * blocked. More importantly, it explicitly lists "forwarding Remotive jobs
 * to other third-party job sites" (naming examples like Jooble, Google
 * Jobs, LinkedIn Jobs) as against their terms, and says that's enforced by
 * revoking API access — which plausibly covers exactly what this feature
 * is (an aggregator storing their jobs in our own searchable job board).
 * The README also points to a separate paid/licensed arrangement for that
 * kind of use (email hello@remotive.com), which we have not obtained.
 *
 * This adapter exists (and is tested) so the capability is ready, but
 * lib/jobIngestion/seedSources.ts does NOT seed a Remotive source — see
 * the Phase 2a report. Do not enable it without written confirmation from
 * Remotive that this use case is permitted, or a paid agreement.
 */
import type { JobSourceAdapter, NormalizedJob } from '../types'
import { fetchJson } from '../httpFetch'
import { sanitizeJobDescription } from '../sanitizeHtml'

interface RemotiveJob {
  id: number
  url: string
  title: string
  company_name: string
  candidate_required_location?: string
  publication_date?: string
  salary?: string
  description?: string
}

interface RemotiveResponse {
  jobs: RemotiveJob[]
}

export const remotiveAdapter: JobSourceAdapter = {
  id: 'remotive',
  // Remotive has one global feed, not a per-company board — the config
  // param is intentionally unused.
  async fetchJobs() {
    const result = await fetchJson<RemotiveResponse>('https://remotive.com/api/remote-jobs')
    if (!result.ok || !result.data) {
      throw new Error(`remotive fetch failed: HTTP ${result.status}`)
    }

    const jobs: NormalizedJob[] = (result.data.jobs ?? []).map((j) => ({
      source: 'remotive',
      sourceJobId: String(j.id),
      atsType: null,
      applyUrl: j.url,
      sourceUrl: j.url, // required link-back per Remotive's terms
      attributionLabel: 'Jobs via Remotive', // required attribution per Remotive's terms
      company: j.company_name,
      title: j.title,
      location: j.candidate_required_location ?? null,
      remoteType: 'remote', // Remotive is remote-only by definition
      descriptionText: sanitizeJobDescription(j.description),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPredicted: false,
      postedAt: j.publication_date ? new Date(j.publication_date) : null,
      language: null,
    }))

    return { jobs }
  },
}
