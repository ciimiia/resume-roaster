/**
 * Shapes for the tailoring pipeline — the LLM's structured output
 * (validated by zod, same pattern as lib/resumeProfile.ts and
 * lib/matching/rerank.ts), the deterministic anti-fabrication guard's
 * output (lib/tailoring/guard.ts), and ATS keyword-coverage output
 * (lib/tailoring/ats.ts).
 */
import { z } from 'zod'

export const TailoredExperienceEntrySchema = z.object({
  // Echoed back verbatim from the source profile, never rewritten — the
  // guard (lib/tailoring/guard.ts) checks these against the source
  // exactly and flags anything that doesn't match. Reordering experience
  // entries is allowed; renaming the employer or title is not.
  company: z.string(),
  title: z.string(),
  bullets: z.array(z.string()).max(10),
})

export const TailoredProfileSchema = z.object({
  summary: z.string(),
  experience: z.array(TailoredExperienceEntrySchema).max(20),
  skills: z.array(z.string()).max(60),
  keywordsToEmphasize: z.array(z.string()).max(20),
})
export type TailoredProfile = z.infer<typeof TailoredProfileSchema>

export const ChangeItemSchema = z.object({
  field: z.string(), // e.g. "summary", "experience[0].bullets[1]", "skills"
  reason: z.string(),
})
export type ChangeItem = z.infer<typeof ChangeItemSchema>

export const TailorResponseSchema = z.object({
  tailoredProfile: TailoredProfileSchema,
  changes: z.array(ChangeItemSchema).max(40),
})
export type TailorResponse = z.infer<typeof TailorResponseSchema>

export const FABRICATION_CATEGORIES = [
  'employer', 'title', 'date', 'degree', 'skill', 'certification', 'metric',
] as const
export type FabricationCategory = (typeof FABRICATION_CATEGORIES)[number]

export const FabricationFlagSchema = z.object({
  category: z.enum(FABRICATION_CATEGORIES),
  location: z.string(), // same "field path" convention as ChangeItem.field
  value: z.string(), // the specific fabricated text found
  message: z.string(),
})
export type FabricationFlag = z.infer<typeof FabricationFlagSchema>

export const AtsCoverageSchema = z.object({
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  formattingWarnings: z.array(z.string()),
})
export type AtsCoverage = z.infer<typeof AtsCoverageSchema>

export const EMPTY_ATS_COVERAGE: AtsCoverage = { matchedKeywords: [], missingKeywords: [], formattingWarnings: [] }
