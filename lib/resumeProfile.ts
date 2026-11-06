/**
 * The structured resume profile shape — single source of truth for:
 * - validating the LLM's parsing output (lib/resumeParsing.ts)
 * - the `profiles` table's JSON columns (lib/db/schema.ts)
 * - the profile review UI's form shape (app/profile/*)
 *
 * Every field the LLM might reasonably omit is optional/defaulted — a
 * resume with no listed languages shouldn't fail validation, it should
 * just parse to an empty array.
 */

import { z } from 'zod'

export const ContactSchema = z.object({
  name: z.string().default(''),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(z.string()).default([]),
})

export const ExperienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
})

export const EducationEntrySchema = z.object({
  school: z.string(),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const ProjectEntrySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  link: z.string().optional(),
})

export const LanguageEntrySchema = z.object({
  name: z.string(),
  proficiency: z.string().optional(),
})

export const CertificationEntrySchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
})

export const ParsedProfileSchema = z.object({
  contact: ContactSchema,
  summary: z.string().default(''),
  experience: z.array(ExperienceEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  skills: z.array(z.string()).default([]),
  projects: z.array(ProjectEntrySchema).default([]),
  languages: z.array(LanguageEntrySchema).default([]),
  certifications: z.array(CertificationEntrySchema).default([]),
})

export type ParsedProfile = z.infer<typeof ParsedProfileSchema>

export const EMPTY_PROFILE: ParsedProfile = {
  contact: { name: '', links: [] },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  languages: [],
  certifications: [],
}

// ── Job preferences ─────────────────────────────────────────────────────
export const SENIORITY_LEVELS = ['intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'] as const
export const REMOTE_TYPES = ['remote', 'hybrid', 'onsite'] as const

export const JobPreferencesSchema = z.object({
  targetTitles: z.array(z.string()).default([]),
  seniority: z.enum(SENIORITY_LEVELS).optional(),
  locations: z.array(z.string()).default([]),
  remoteType: z.array(z.enum(REMOTE_TYPES)).default([]),
  countries: z.array(z.string()).default([]),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  salaryCurrency: z.string().optional(),
  visaNeeds: z.string().optional(),
  languages: z.array(z.string()).default([]),
  // Companies this user never wants matched/shown, regardless of score —
  // separate from the admin-wide blocked_companies table (lib/db/schema.ts).
  excludedCompanies: z.array(z.string()).default([]),
})

export type JobPreferences = z.infer<typeof JobPreferencesSchema>

export const EMPTY_JOB_PREFERENCES: JobPreferences = {
  targetTitles: [],
  locations: [],
  remoteType: [],
  countries: [],
  languages: [],
  excludedCompanies: [],
}
