/**
 * Single source of truth for product identity.
 *
 * Change it here and it propagates everywhere (nav, footer, metadata, OG
 * image, emails, etc). Don't hardcode the product name/slug anywhere else;
 * import from here.
 */

export const PRODUCT = {
  name: 'Michi AI',
  /** Short form for tight spaces (compact nav, favicon alt text). */
  shortName: 'Michi AI',
  /** Used in generated filenames, URL slugs, etc. Lowercase, no spaces. */
  slug: 'michi-ai',
  tagline: 'AI Resume Feedback in 12 Seconds',
} as const
