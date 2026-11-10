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
