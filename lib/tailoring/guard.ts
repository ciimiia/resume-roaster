/**
 * Anti-fabrication guard — deterministic code, NOT the LLM, per the
 * project rule that tailoring may only reword/reorder/emphasize/trim
 * facts already in the approved profile, never invent anything. This is
 * the authoritative check; the model's own `changes[]` self-report
 * (lib/tailoring/types.ts) is UI copy only and is never trusted on its own.
 *
 * What gets flagged, and what happens to it:
 *  - A tailored experience entry's company/title that doesn't exactly
 *    match (case-insensitive) a company/title in the source profile.
 *  - A number/percentage/metric appearing in a tailored bullet or the
 *    summary that doesn't appear anywhere in the source profile's text.
 *  - A date-like token (year, month-year) in a bullet/summary not present
 *    anywhere in the source profile's dates.
 *  - A degree-pattern phrase (Bachelor's, MBA, PhD, B.S., ...) in a bullet
 *    or summary that isn't backed by the source profile's education.
 *  - A certification-pattern phrase not backed by the source profile's
 *    certifications.
 *  - A skill in the tailored skills list not present in the source
 *    profile's skills (case-insensitive).
 *
 * Skills are the one category auto-removed by sanitizeTailoredProfile
 * (lossless and safe — dropping an invented skill from a list breaks
 * nothing structurally). Everything else is left in place but flagged —
 * rewriting a bullet's text automatically risks producing a grammatically
 * broken sentence, so those are surfaced prominently in the UI instead
 * (JobMatchItem-style "never silently accepted": the flags are always
 * returned alongside the tailored content, never swallowed).
 */
import type { ParsedProfile } from '@/lib/resumeProfile'
import type { TailoredProfile, FabricationFlag, FabricationCategory } from './types'

const NUMBER_RE = /\d[\d,.]*\s*[%xX+]?/g
const YEAR_RE = /\b(19|20)\d{2}\b/g
const DEGREE_KEYWORDS = [
  "bachelor's", 'bachelor', "master's", 'master', 'mba', 'phd', 'ph.d', 'doctorate',
  'b.s.', 'b.a.', 'm.s.', 'm.a.', 'associate degree', "associate's",
]
const CERTIFICATION_KEYWORDS = [
  'certified', 'certification', 'certificate', 'pmp', 'cpa', 'cissp', 'scrum master',
  'six sigma', 'aws certified', 'cfa', 'cia ', 'cka', 'ckad',
]

function lowerSet(values: (string | undefined | null)[]): Set<string> {
  return new Set(values.filter((v): v is string => !!v && v.trim().length > 0).map(v => v.trim().toLowerCase()))
}

function extractTokens(text: string, re: RegExp): string[] {
  return [...text.matchAll(re)].map(m => m[0].trim().toLowerCase()).filter(Boolean)
}

function containsAny(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase()
  return keywords.filter(k => lower.includes(k))
}

interface SourceFacts {
  companies: Set<string>
  titles: Set<string>
  skills: Set<string>
  numbers: Set<string>
  years: Set<string>
  degreeText: string // combined education text, searched as substring for degree keyword backing
  certificationText: string
  allText: string // full corpus (summary + all bullets + everything) — used for "does this phrase appear anywhere" checks
}

function buildSourceFacts(profile: ParsedProfile): SourceFacts {
  const companies = lowerSet(profile.experience.map(e => e.company))
  const titles = lowerSet(profile.experience.map(e => e.title))
  const skills = lowerSet(profile.skills)

  const allTextParts: string[] = [profile.summary]
  for (const e of profile.experience) {
    allTextParts.push(e.title, e.company, e.location ?? '', e.startDate ?? '', e.endDate ?? '', ...e.bullets)
  }
  for (const e of profile.education) {
    allTextParts.push(e.school, e.degree ?? '', e.field ?? '', e.startDate ?? '', e.endDate ?? '')
  }
  for (const p of profile.projects) {
    allTextParts.push(p.name, p.description ?? '')
  }
  for (const c of profile.certifications) {
    allTextParts.push(c.name, c.issuer ?? '', c.date ?? '')
  }
  const allText = allTextParts.join('\n')

  const numbers = new Set(extractTokens(allText, NUMBER_RE))
  const years = new Set(extractTokens(allText, YEAR_RE))

  const degreeText = profile.education.map(e => `${e.degree ?? ''} ${e.field ?? ''} ${e.school}`).join('\n').toLowerCase()
  const certificationText = profile.certifications.map(c => `${c.name} ${c.issuer ?? ''}`).join('\n').toLowerCase()

  return { companies, titles, skills, numbers, years, degreeText, certificationText, allText }
}

/** Flags anything in `text` not traceable to the source profile's facts — shared by bullet and summary checks. */
function checkProseText(text: string, location: string, source: SourceFacts, flags: FabricationFlag[]): void {
  for (const num of extractTokens(text, NUMBER_RE)) {
    if (!source.numbers.has(num)) {
      flags.push({ category: 'metric', location, value: num, message: `Number "${num}" does not appear anywhere in the approved profile.` })
    }
  }
  for (const year of extractTokens(text, YEAR_RE)) {
    if (!source.years.has(year)) {
      flags.push({ category: 'date', location, value: year, message: `Year "${year}" does not appear anywhere in the approved profile.` })
    }
  }
  for (const kw of containsAny(text, DEGREE_KEYWORDS)) {
    if (!source.degreeText.includes(kw)) {
      flags.push({ category: 'degree', location, value: kw, message: `Degree reference "${kw}" is not backed by the approved profile's education.` })
    }
  }
  for (const kw of containsAny(text, CERTIFICATION_KEYWORDS)) {
    if (!source.certificationText.includes(kw)) {
      flags.push({ category: 'certification', location, value: kw, message: `Certification reference "${kw}" is not backed by the approved profile's certifications.` })
    }
  }
}

export function runFabricationGuard(sourceProfile: ParsedProfile, tailored: TailoredProfile): FabricationFlag[] {
  const source = buildSourceFacts(sourceProfile)
  const flags: FabricationFlag[] = []

  tailored.experience.forEach((entry, i) => {
    const company = entry.company.trim().toLowerCase()
    const title = entry.title.trim().toLowerCase()
    if (!source.companies.has(company)) {
      flags.push({ category: 'employer', location: `experience[${i}].company`, value: entry.company, message: `"${entry.company}" is not one of the approved profile's employers.` })
    }
    if (!source.titles.has(title)) {
      flags.push({ category: 'title', location: `experience[${i}].title`, value: entry.title, message: `"${entry.title}" is not one of the approved profile's job titles.` })
    }
    entry.bullets.forEach((bullet, j) => checkProseText(bullet, `experience[${i}].bullets[${j}]`, source, flags))
  })

  checkProseText(tailored.summary, 'summary', source, flags)

  tailored.skills.forEach((skill, i) => {
    if (!source.skills.has(skill.trim().toLowerCase())) {
      flags.push({ category: 'skill', location: `skills[${i}]`, value: skill, message: `"${skill}" is not one of the approved profile's listed skills.` })
    }
  })

  tailored.keywordsToEmphasize.forEach((kw, i) => {
    const lower = kw.trim().toLowerCase()
    if (!source.skills.has(lower) && !source.allText.toLowerCase().includes(lower)) {
      flags.push({ category: 'skill', location: `keywordsToEmphasize[${i}]`, value: kw, message: `"${kw}" does not appear anywhere in the approved profile.` })
    }
  })

  return flags
}

/**
 * Drops fabricated skills (the one category that's safe to auto-remove —
 * see the module doc above). Everything else stays in the output exactly
 * as the model produced it; the caller must still surface `flags` to the
 * user — this function does not, and cannot, make the output "safe" on
 * its own.
 */
export function sanitizeTailoredProfile(tailored: TailoredProfile, flags: FabricationFlag[]): TailoredProfile {
  const fabricatedSkillValues = new Set(
    flags.filter(f => f.category === 'skill' && f.location.startsWith('skills[')).map(f => f.value.trim().toLowerCase())
  )
  if (fabricatedSkillValues.size === 0) return tailored
  return {
    ...tailored,
    skills: tailored.skills.filter(s => !fabricatedSkillValues.has(s.trim().toLowerCase())),
  }
}

export function flagCategoryLabel(category: FabricationCategory): string {
  return category
}

/**
 * Same prose checks as the bullet/summary scan above, applied to
 * free-form text (the cover letter) instead of a structured
 * TailoredProfile — covers numbers/dates/degrees/certifications, plus an
 * employer/title check: any company or title name mentioned in the
 * letter that doesn't match the source profile's employers/titles.
 * Skills aren't checked here (a cover letter mentioning a skill in prose
 * isn't structured data to compare against a list the way
 * TailoredProfile.skills is).
 */
export function runFabricationGuardOnText(sourceProfile: ParsedProfile, text: string, location = 'coverLetter'): FabricationFlag[] {
  const source = buildSourceFacts(sourceProfile)
  const flags: FabricationFlag[] = []
  checkProseText(text, location, source, flags)
  return flags
}
