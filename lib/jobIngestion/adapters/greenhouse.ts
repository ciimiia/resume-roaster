/**
 * Greenhouse's public job board API — https://docs.greenhouse.io/job-board.html
 * GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 *
 * No auth, no documented rate limit, no documented attribution requirement.
 * The docs frame this as "a company's own board embed" rather than a
 * cross-company aggregation feed — there's no bulk/directory endpoint, and
 * aggregation across many companies isn't explicitly addressed either way.
 * Treated here as "publicly reachable, not expressly licensed for a
 * third-party aggregator" — flagged in the Phase 2a report, not hidden.
 */
import type { JobSourceAdapter, JobSourceConfig, NormalizedJob } from '../types'
import { fetchJson } from '../httpFetch'
import { sanitizeJobDescription } from '../sanitizeHtml'

interface GreenhouseJob {
  id: number
  title: string
  updated_at?: string
  absolute_url: string
  location?: { name?: string }
  content?: string
  offices?: { name?: string }[]
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[]
}

function detectRemoteType(locationName: string | undefined): NormalizedJob['remoteType'] {
  if (!locationName) return null
  const lower = locationName.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  return null
}

export const greenhouseAdapter: JobSourceAdapter = {
  id: 'greenhouse',
  async fetchJobs(config: JobSourceConfig) {
    if (!config.boardToken) return { jobs: [] }

    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(config.boardToken)}/jobs?content=true`
    const result = await fetchJson<GreenhouseResponse>(url)
    if (!result.ok || !result.data) {
      if (result.status === 404) return { jobs: [] } // board doesn't exist / was removed — not an error worth retrying
      throw new Error(`greenhouse fetch failed for board "${config.boardToken}": HTTP ${result.status}`)
    }

    const jobs: NormalizedJob[] = (result.data.jobs ?? []).map((j) => ({
      source: 'greenhouse',
      sourceJobId: String(j.id),
      atsType: 'greenhouse',
      applyUrl: j.absolute_url,
      sourceUrl: j.absolute_url,
      attributionLabel: null,
      company: config.companyName,
      title: j.title,
      location: j.location?.name ?? j.offices?.[0]?.name ?? null,
      remoteType: detectRemoteType(j.location?.name),
      descriptionText: sanitizeJobDescription(j.content),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPredicted: false,
      postedAt: j.updated_at ? new Date(j.updated_at) : null,
      language: null,
    }))

    return { jobs }
  },
}
