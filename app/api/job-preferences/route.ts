import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getJobPreferencesForUser, saveJobPreferencesForUser } from '@/lib/db/jobPreferences'
import { JobPreferencesSchema } from '@/lib/resumeProfile'

async function requireSession() {
  const token = cookies().get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const preferences = await getJobPreferencesForUser(session.userId)
    return NextResponse.json({ preferences })
  } catch (err) {
    console.error('[job-preferences] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const validated = JobPreferencesSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: 'INVALID_PREFERENCES', issues: validated.error.issues.map(i => i.path.join('.')) }, { status: 400 })
    }

    const preferences = await saveJobPreferencesForUser(session.userId, validated.data)
    return NextResponse.json({ preferences })
  } catch (err) {
    console.error('[job-preferences] PUT failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
