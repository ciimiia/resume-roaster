/**
 * Rate-limit constants for /api/analyze (app/api/analyze/route.ts) — kept
 * in their own module rather than exported from the route file because
 * Next's App Router route handlers only permit a fixed set of named
 * exports (GET/POST/config/etc.); anything else fails Next's own route
 * type-checking.
 */

// This endpoint is anonymous and calls a paid OpenRouter model — unlike
// the authenticated routes, there's no per-user identity to throttle on,
// so both an IP-scoped limit (one source hammering it) and a site-wide
// daily cap (bounds total spend regardless of how distributed the
// traffic is) are needed. Same checkRateLimit primitive and pattern as
// app/api/auth/signup/route.ts.
export const IP_LIMIT = { max: 8, windowSeconds: 10 * 60 }
export const GLOBAL_DAILY_LIMIT = { max: 500, windowSeconds: 24 * 60 * 60 }

// Caps the prompt's token cost for a pathological input (e.g. a PDF with
// thousands of duplicated pages) — generous enough that no real resume
// is ever actually truncated (a few pages of text is a tiny fraction of
// this), silent rather than a hard error since the route's whole design
// already tolerates bad input by falling back to sample text/data.
export const MAX_RESUME_TEXT_CHARS = 12_000
