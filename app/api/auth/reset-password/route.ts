import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'
import { resetPassword } from '@/lib/passwordReset'

// Tokens are 256-bit random (lib/passwordReset.ts) — not practically
// guessable regardless of rate limit — this is volumetric throttling for
// the endpoint itself, same reasoning as every other auth route here.
const IP_LIMIT = { max: 10, windowSeconds: 60 * 60 }

export async function POST(req: NextRequest) {
  if (!env.hasEmailProvider) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  try {
    const { token, password } = await req.json() as { token?: string; password?: string }
    if (!token || !password) {
      return NextResponse.json({ error: 'TOKEN_AND_PASSWORD_REQUIRED' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'PASSWORD_WEAK' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ipRate = await checkRateLimit(`resetpw:ip:${ip}`, IP_LIMIT.max, IP_LIMIT.windowSeconds)
    if (!ipRate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const result = await resetPassword(token, password)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/reset-password] failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
