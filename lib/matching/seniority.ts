/**
 * Best-effort seniority inference from a job title — jobs have no
 * structured seniority field (none of the Phase 2a adapters extract one;
 * ATS boards don't expose it uniformly), so this is keyword matching
 * against the title, not a reliable signal. Used as an inclusive filter in
 * lib/matching/filters.ts: a title we can't classify passes through
 * rather than being excluded, since being wrong about a title's level is
 * worse than not filtering on it at all.
 */
import { SENIORITY_LEVELS } from '@/lib/resumeProfile'

type Seniority = (typeof SENIORITY_LEVELS)[number]

const KEYWORDS: Record<Seniority, RegExp> = {
  intern: /\bintern(ship)?\b/i,
  junior: /\b(junior|jr\.?|entry.level|associate)\b/i,
  mid: /\bmid.level\b/i,
  senior: /\b(senior|sr\.?)\b/i,
  lead: /\blead\b/i,
  principal: /\bprincipal\b/i,
  executive: /\b(director|vp|vice president|chief|head of|executive)\b/i,
}

/** Returns null when the title gives no usable signal — treat as "unknown", not a filter mismatch. */
export function inferSeniorityFromTitle(title: string): Seniority | null {
  for (const level of SENIORITY_LEVELS) {
    if (KEYWORDS[level].test(title)) return level
  }
  return null
}
