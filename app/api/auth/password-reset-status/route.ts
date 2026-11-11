import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

/** Lets the client conditionally show/hide the "Forgot password?" link and the /forgot-password, /reset-password pages — the feature is hidden entirely when no email provider is configured, not shown in a broken state. */
export async function GET() {
  return NextResponse.json({ enabled: env.hasEmailProvider })
}
