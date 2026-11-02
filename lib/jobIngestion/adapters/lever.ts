/**
 * Lever's public postings API (v0) — https://hire.lever.co/developer/documentation
 * GET https://api.lever.co/v0/postings/{company}?mode=json
 *
 * No auth for v0. Lever's documented rate limit (10 req/sec steady, burst
 * 20/sec) is specified for the authenticated v1 Data API; v0's limit isn't
 * separately documented, so the ingestion runner's per-source throttling
 * (lib/jobIngestion/runner.ts) applies the same conservative pacing to it.
 * No attribution requirement documented. Docs frame the API as something
 * customers use to power their own careers page — cross-company
 * aggregation isn't explicitly addressed either way.
 */
import type { JobSourceAdapter, JobSourceConfig, NormalizedJob } from '../types'
import { fetchJson } from '../httpFetch'
import { sanitizeJobDescription } from '../sanitizeHtml'

interface LeverPosting {
  id: string
  text: string
  hostedUrl: string
  applyUrl?: string
  createdAt?: number
  categories?: { location?: string; team?: string; commitment?: string }
  descriptionPlain?: string
  description?: string
  workplaceType?: string // 'remote' | 'hybrid' | 'onsite' on newer postings
}

function detectRemoteType(posting: LeverPosting): NormalizedJob['remoteType'] {
  if (posting.workplaceType === 'remote' || posting.workplaceType === 'hybrid' || posting.workplaceType === 'onsite') {
    return posting.workplaceType
  }
  const loc = posting.categories?.location?.toLowerCase() ?? ''
  if (loc.includes('remote')) return 'remote'
  if (loc.includes('hybrid')) return 'hybrid'
  return null
}

export const leverAdapter: JobSourceAdapter = {
  id: 'lever',
  async fetchJobs(config: JobSourceConfig) {
    if (!config.boardToken) return { jobs: [] }

    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(config.boardToken)}?mode=json`
    const result = await fetchJson<LeverPosting[]>(url)
    if (!result.ok || !result.data) {
      if (result.status === 404) return { jobs: [] }
      throw new Error(`lever fetch failed for company "${config.boardToken}": HTTP ${result.status}`)
    }

    const jobs: NormalizedJob[] = result.data.map((p) => ({
      source: 'lever',
      sourceJobId: p.id,
      atsType: 'lever',
      applyUrl: p.applyUrl ?? p.hostedUrl,
      sourceUrl: p.hostedUrl,
      attributionLabel: null,
      company: config.companyName,
      title: p.text,
      location: p.categories?.location ?? null,
      remoteType: detectRemoteType(p),
      descriptionText: sanitizeJobDescription(p.descriptionPlain ?? p.description),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPredicted: false,
      postedAt: p.createdAt ? new Date(p.createdAt) : null,
      language: null,
    }))

    return { jobs }
  },
}
