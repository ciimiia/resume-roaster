/**
 * Shared inline-style helpers.
 *
 * The app styles components with inline `style` objects (no CSS modules /
 * Tailwind), keyed off the CSS custom properties defined in globals.css.
 * This file is the single source of truth for patterns reused across many
 * components (cards, section rhythm, etc.) — import from here instead of
 * redefining the same object inline or pulling `cardStyle` out of a
 * component file (it used to live in Landing.tsx and was imported from
 * there by nine unrelated files).
 */

import type { CSSProperties } from 'react'

/** Standard elevated surface used for cards, panels, and modals. */
export const cardStyle = (extra: CSSProperties = {}): CSSProperties => ({
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--shadow-1)',
  ...extra,
})

/** Page-level horizontal gutter + max width, for top-level section wrappers. */
export const containerStyle = (maxWidth = 1240, extra: CSSProperties = {}): CSSProperties => ({
  maxWidth,
  margin: '0 auto',
  padding: `0 var(--gutter)`,
  ...extra,
})
