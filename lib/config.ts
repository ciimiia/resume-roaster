/**
 * Single source of truth for product identity.
 *
 * Name is NOT final — change it here and it propagates everywhere (nav,
 * footer, metadata, OG image, emails later, etc). Don't hardcode
 * "Resume Roaster" / "resumeroaster" anywhere else; import from here.
 */

export const PRODUCT = {
  name: 'Resume Roaster',
  /** Short form for tight spaces (compact nav, favicon alt text). */
  shortName: 'Resume Roaster',
  /** Used in generated filenames, URL slugs, etc. Lowercase, no spaces. */
  slug: 'resume-roaster',
  tagline: 'AI Resume Feedback in 12 Seconds',
} as const
