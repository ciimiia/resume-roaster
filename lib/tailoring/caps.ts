/**
 * Rate-limit constants for the tailoring + tailored-cover-letter routes —
 * per-user, since these are authenticated (unlike /api/analyze's
 * anonymous+IP-based limits in lib/analyzeRateLimit.ts). Both a short
 * per-minute window (stops a runaway client loop) and a daily cap (bounds
 * per-user LLM cost) via the same lib/rateLimit.ts primitive used
 * elsewhere (lib/matching/getMatches.ts's RERANK_DAILY_CAP is the closest
 * precedent).
 */
export const TAILOR_MINUTE_LIMIT = { max: 3, windowSeconds: 60 }
export const TAILOR_DAILY_LIMIT = { max: 20, windowSeconds: 24 * 60 * 60 }

export const COVER_LETTER_MINUTE_LIMIT = { max: 3, windowSeconds: 60 }
export const COVER_LETTER_DAILY_LIMIT = { max: 20, windowSeconds: 24 * 60 * 60 }

// PDF export doesn't call the LLM, but it does launch a full Chromium
// process per request (lib/tailoring/pdf/render.ts) — real CPU/memory
// cost and the slowest routes in this app (~9-13s, see the Phase 4 PDF
// report). A 10-minute window rather than per-minute: someone legitimately
// comparing two templates needs more than one request within a minute.
export const PDF_WINDOW_LIMIT = { max: 6, windowSeconds: 10 * 60 }
export const PDF_DAILY_LIMIT = { max: 40, windowSeconds: 24 * 60 * 60 }
