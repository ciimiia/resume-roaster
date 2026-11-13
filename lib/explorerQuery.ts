// Shared URL query shape for the homepage world-map picker → /jobs and
// /universities. Pure functions so they're unit-testable without a browser
// (scripts/test-explorerQuery.ts) and reusable from both the landing page
// (building the URL on submit) and the destination pages (reading it back).

export type Track = 'work' | 'study'
export type StudyLevel = 'bachelor' | 'master' | 'phd' | 'other'

export type ExplorerWorkQuery = {
  track: 'work'
  countries: string[] // ISO 3166-1 alpha-2, uppercase
  cities: string[] // free-text city names, optional refinement of `countries`
  career: string
}

export type ExplorerStudyQuery = {
  track: 'study'
  countries: string[]
  cities: string[]
  level: StudyLevel | ''
  field: string
}

export type ExplorerQuery = ExplorerWorkQuery | ExplorerStudyQuery

const STUDY_LEVELS: StudyLevel[] = ['bachelor', 'master', 'phd', 'other']

function normalizeCountries(raw: string | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const iso = part.trim().toUpperCase()
    if (/^[A-Z]{2}$/.test(iso) && !seen.has(iso)) {
      seen.add(iso)
      out.push(iso)
    }
  }
  return out
}

function normalizeCities(raw: string | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const name = part.trim()
    if (name && !seen.has(name)) {
      seen.add(name)
      out.push(name)
    }
  }
  return out
}

/** Builds the query string (without a leading "?") for a destination URL. */
export function buildExplorerQueryString(q: ExplorerQuery): string {
  const params = new URLSearchParams()
  params.set('track', q.track)
  if (q.countries.length) params.set('countries', q.countries.join(','))
  if (q.cities.length) params.set('cities', q.cities.join(','))
  if (q.track === 'work') {
    if (q.career.trim()) params.set('career', q.career.trim())
  } else {
    if (q.level) params.set('level', q.level)
    if (q.field.trim()) params.set('field', q.field.trim())
  }
  return params.toString()
}

/** Parses a destination page's search params back into explorer state. */
export function parseExplorerQuery(searchParams: URLSearchParams): ExplorerQuery {
  const track: Track = searchParams.get('track') === 'study' ? 'study' : 'work'
  const countries = normalizeCountries(searchParams.get('countries'))
  const cities = normalizeCities(searchParams.get('cities'))

  if (track === 'study') {
    const levelRaw = searchParams.get('level') ?? ''
    const level = (STUDY_LEVELS as string[]).includes(levelRaw) ? (levelRaw as StudyLevel) : ''
    return { track, countries, cities, level, field: searchParams.get('field') ?? '' }
  }
  return { track, countries, cities, career: searchParams.get('career') ?? '' }
}
