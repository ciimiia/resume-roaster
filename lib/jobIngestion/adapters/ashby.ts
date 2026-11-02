/**
 * Ashby's public job board posting API —
 * GET https://api.ashbyhq.com/posting-api/job-board/{board_name}?includeCompensation=true
 *
 * No auth. This is the weakest-documented of the three ATS adapters — this
 * session couldn't reach Ashby's own developer reference pages (they
 * 404'd); secondary sources describe it as unauthenticated and possibly
 * IP-rate-limited, but that's unconfirmed from a primary source. Treated
 * conservatively: same throttling as the others, flagged explicitly in the
 * Phase 2a report as needing direct confirmation from Ashby before relying
 * on it at any real scale.
 */
import type { JobSourceAdapter, JobSourceConfig, NormalizedJob } from '../types'
import { fetchJson } from '../httpFetch'
import { sanitizeJobDescription } from '../sanitizeHtml'

interface AshbyJob {
  id: string
  title: string
  location?: string
  isRemote?: boolean
  descriptionHtml?: string
  applyUrl?: string
  jobUrl?: string
  publishedAt?: string
}

interface AshbyResponse {
  jobs: AshbyJob[]
}

export const ashbyAdapter: JobSourceAdapter = {
  id: 'ashby',
  async fetchJobs(config: JobSourceConfig) {
    if (!config.boardToken) return { jobs: [] }

    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(config.boardToken)}?includeCompensation=false`
    const result = await fetchJson<AshbyResponse>(url)
    if (!result.ok || !result.data) {
      if (result.status === 404) return { jobs: [] }
      throw new Error(`ashby fetch failed for board "${config.boardToken}": HTTP ${result.status}`)
    }

    const jobs: NormalizedJob[] = (result.data.jobs ?? []).map((j): NormalizedJob => ({
      source: 'ashby',
      sourceJobId: j.id,
      atsType: 'ashby',
      applyUrl: j.applyUrl ?? j.jobUrl ?? '',
      sourceUrl: j.jobUrl ?? j.applyUrl ?? '',
      attributionLabel: null,
      company: config.companyName,
      title: j.title,
      location: j.location ?? null,
      remoteType: j.isRemote ? 'remote' : null,
      descriptionText: sanitizeJobDescription(j.descriptionHtml),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPredicted: false,
      postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
      language: null,
    })).filter((j) => j.applyUrl) // drop anything we couldn't resolve a URL for — nothing useful to show

    return { jobs }
  },
}
