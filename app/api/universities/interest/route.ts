import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'
import { readJsonWithLimit } from '@/lib/requestSize'
import { createUniversityInterestSignup } from '@/lib/db/universityInterest'

// Anonymous (no session required — a study-track visitor isn't necessarily
// signed in), so this is throttled the same way signup/forgot-password are:
// email-scoped to stop repeat submissions for one address, IP-scoped to
// stop one source spamming many addresses.
const EMAIL_LIMIT = { max: 3, windowSeconds: 60 * 60 }
const IP_LIMIT = { max: 10, windowSeconds: 60 * 60 }
const MAX_BODY_BYTES = 4 * 1024

interface Body {
  email?: string
  consentAccepted?: boolean
  countries?: string[]
  level?: string | null
  field?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_LEVELS = new Set(['bachelor', 'master', 'phd', 'other'])

export async function POST(req: NextRequest) {
  const parsed = await readJsonWithLimit<Body>(req, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.error === 'TOO_LARGE' ? 413 : 400 })
  }
  const { email, consentAccepted, countries, level, field } = parsed.data

  const normalizedEmail = (email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 })
  }
  if (!consentAccepted) {
    return NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 400 })
  }

  const ip = getClientIp(req)
  const [emailRate, ipRate] = await Promise.all([
    checkRateLimit(`uni-interest:email:${normalizedEmail}`, EMAIL_LIMIT.max, EMAIL_LIMIT.windowSeconds),
    checkRateLimit(`uni-interest:ip:${ip}`, IP_LIMIT.max, IP_LIMIT.windowSeconds),
  ])
  if (!emailRate.allowed || !ipRate.allowed) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  const safeCountries = Array.isArray(countries)
    ? countries.filter(c => typeof c === 'string' && /^[A-Z]{2}$/.test(c)).slice(0, 50)
    : []
  const safeLevel = typeof level === 'string' && VALID_LEVELS.has(level) ? level : null
  const safeField = typeof field === 'string' ? field.slice(0, 200) : null

  try {
    await createUniversityInterestSignup({ email: normalizedEmail, countries: safeCountries, level: safeLevel, field: safeField })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[universities/interest] POST failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
