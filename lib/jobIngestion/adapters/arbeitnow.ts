/**
 * Arbeitnow's public API — https://www.arbeitnow.com/api/job-board-api
 * Terms: https://arbeitnow.com/terms
 *
 * ** NOT enabled by default — see the compliance note below. **
 *
 * Arbeitnow's own terms (confirmed primary source) require a link back to
 * arbeitnow.com, but Section 2's general materials clause also restricts
 * use to "personal, non-commercial... viewing only," bars "mirroring on
 * other servers," and requires deleting downloaded materials when the
 * license ends — in direct tension with a commercial SaaS product caching
 * job listings into its own database. Arbeitnow can also revoke API
 * permission at any time. No carve-out for the API feed specifically was
 * found separate from that general clause.
 *
 * This adapter exists (and is tested) so the capability is ready, but
 * lib/jobIngestion/seedSources.ts does NOT seed an Arbeitnow source — see
 * the Phase 2a report. Do not enable it without written confirmation from
 * Arbeitnow that commercial aggregation/caching is permitted.
 */
import type { JobSourceAdapter, NormalizedJob } from '../types'
import { fetchJson } from '../httpFetch'
import { sanitizeJobDescription } from '../sanitizeHtml'

interface ArbeitnowJob {
  slug: string
  company_name: string
  title: string
  description?: string
  remote?: boolean
  url: string
  location?: string
  created_at?: number // unix seconds
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[]
}

export const arbeitnowAdapter: JobSourceAdapter = {
  id: 'arbeitnow',
  // Arbeitnow has one global feed, not a per-company board — the config
  // param is intentionally unused.
  async fetchJobs() {
    const result = await fetchJson<ArbeitnowResponse>('https://www.arbeitnow.com/api/job-board-api')
    if (!result.ok || !result.data) {
      throw new Error(`arbeitnow fetch failed: HTTP ${result.status}`)
    }

    const jobs: NormalizedJob[] = (result.data.data ?? []).map((j) => ({
      source: 'arbeitnow',
      sourceJobId: j.slug,
      atsType: null,
      applyUrl: j.url,
      sourceUrl: j.url, // required link-back per Arbeitnow's terms
      attributionLabel: 'Jobs via Arbeitnow',
      company: j.company_name,
      title: j.title,
      location: j.location ?? null,
      remoteType: j.remote ? 'remote' : null,
      descriptionText: sanitizeJobDescription(j.description),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPredicted: false,
      postedAt: j.created_at ? new Date(j.created_at * 1000) : null,
      language: null,
    }))

    return { jobs }
  },
}
