import type { NextRequest } from 'next/server'

/**
 * Best-effort client IP for rate limiting. Vercel sets `x-forwarded-for`
 * (and the more specific `x-real-ip`) on every request; this is trusted
 * because it only runs behind Vercel's edge network, which sets these
 * headers itself — a client can't forge them to spoof a different IP.
 * Falls back to a constant so rate limiting still degrades to "one shared
 * bucket" rather than throwing if neither header is present (e.g. local
 * dev without a proxy in front).
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}
