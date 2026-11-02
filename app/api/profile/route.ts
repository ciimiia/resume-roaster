import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getProfileForUser, saveProfileForUser } from '@/lib/db/profiles'
import { getResumeForUser } from '@/lib/db/resumes'
import { ParsedProfileSchema } from '@/lib/resumeProfile'

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getProfileForUser(session.userId)
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[profile] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { profile: unknown; sourceResumeId?: string; approved?: boolean }

    const validated = ParsedProfileSchema.safeParse(body.profile)
    if (!validated.success) {
      return NextResponse.json({ error: 'INVALID_PROFILE', issues: validated.error.issues.map(i => i.path.join('.')) }, { status: 400 })
    }

    // If a sourceResumeId is given, verify the requester actually owns that
    // resume before linking the profile to it — otherwise a user could
    // point their profile's sourceResumeId at another user's resume id.
    if (body.sourceResumeId) {
      const owned = await getResumeForUser(body.sourceResumeId, session.userId)
      if (!owned) return NextResponse.json({ error: 'RESUME_NOT_FOUND' }, { status: 404 })
    }

    const profile = await saveProfileForUser(session.userId, validated.data, {
      sourceResumeId: body.sourceResumeId ?? null,
      approved: body.approved ?? false,
    })

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[profile] PUT failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
