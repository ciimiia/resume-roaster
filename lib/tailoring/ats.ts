/**
 * ATS keyword coverage + simple formatting checks against the tailored
 * output — deterministic, no LLM call. Keyword extraction is intentionally
 * simple (stopword-filtered token overlap, not NLP) — good enough for
 * "does the resume text contain this word", which is what ATS keyword
 * matching actually checks in practice.
 */
import type { TailoredProfile, AtsCoverage } from './types'

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'as', 'it', 'from', 'will',
  'we', 'you', 'your', 'our', 'their', 'who', 'what', 'etc', 'into', 'about', 'per',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
}

function tailoredProfileText(profile: TailoredProfile): string {
  return [profile.summary, ...profile.experience.flatMap(e => [e.title, e.company, ...e.bullets]), ...profile.skills].join(' ')
}

// Tab (0x09) and the Unicode line/paragraph separators (0x2028/0x2029) can
// break how some ATS parsers extract text from a bullet — checked by char
// code rather than a regex literal containing those code points directly,
// which editors/tools can silently normalize into real line breaks.
function containsTabOrLineSeparator(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 0x09 || code === 0x2028 || code === 0x2029) return true
  }
  return false
}

/** Checks the tailored resume's keyword coverage against the job description text. */
export function checkAtsCoverage(tailored: TailoredProfile, jobDescriptionText: string): AtsCoverage {
  const resumeTokens = new Set(tokenize(tailoredProfileText(tailored)))
  const jobTokens = tokenize(jobDescriptionText)

  // Dedupe while preserving first-seen order, so the list reads like the
  // job posting rather than alphabetical noise.
  const seen = new Set<string>()
  const matched: string[] = []
  const missing: string[] = []
  for (const token of jobTokens) {
    if (seen.has(token)) continue
    seen.add(token)
    if (resumeTokens.has(token)) matched.push(token)
    else missing.push(token)
  }

  const formattingWarnings: string[] = []
  if (tailored.summary.length > 600) {
    formattingWarnings.push('Summary is longer than recommended for a single-column ATS resume (aim under ~600 characters).')
  }
  for (const [i, entry] of tailored.experience.entries()) {
    for (const [j, bullet] of entry.bullets.entries()) {
      if (bullet.length > 280) {
        formattingWarnings.push(`experience[${i}].bullets[${j}] is unusually long for a single bullet point.`)
      }
      if (containsTabOrLineSeparator(bullet)) {
        formattingWarnings.push(`experience[${i}].bullets[${j}] contains a tab or line-separator character that can break ATS text extraction.`)
      }
    }
  }
  if (tailored.skills.length > 40) {
    formattingWarnings.push('Skills list is unusually long — consider trimming to the most relevant ones for this job.')
  }

  return { matchedKeywords: matched.slice(0, 60), missingKeywords: missing.slice(0, 60), formattingWarnings }
}
