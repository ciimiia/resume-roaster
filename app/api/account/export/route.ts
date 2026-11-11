import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { findUserById } from '@/lib/db/users'
import { getProfileForUser } from '@/lib/db/profiles'
import { getJobPreferencesForUser } from '@/lib/db/jobPreferences'
import { listResumesForUser } from '@/lib/db/resumes'
import { listTailoredResumesForUser } from '@/lib/db/tailoredResumes'
import { listFullCoverLettersForUser } from '@/lib/db/coverLetters'
import { listSavedJobIds } from '@/lib/db/savedJobs'
import { listHiddenJobIds } from '@/lib/db/hiddenJobs'
import { listResultsForUser } from '@/lib/db/results'
import { checkRateLimit } from '@/lib/rateLimit'

const LIMIT = { max: 5, windowSeconds: 60 * 60 }

/**
 * "Download my data" — a JSON export of everything stored about the
 * signed-in user. Resume FILE BYTES aren't embedded (impractical in a JSON
 * export and already downloadable individually via
 * GET /api/resumes/[id]/file) — this includes resume metadata and the
 * parsed/structured text instead. Everything here is read via functions
 * scoped to `session.userId`, same ownership pattern as every other
 * per-user route in this app.
 */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rate = await checkRateLimit(`account-export:${session.userId}`, LIMIT.max, LIMIT.windowSeconds)
    if (!rate.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })

    const user = await findUserById(session.userId)
    if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    const [profile, jobPreferences, resumes, tailoredResumes, coverLetters, savedJobIds, hiddenJobIds, roasts] = await Promise.all([
      getProfileForUser(session.userId),
      getJobPreferencesForUser(session.userId),
      listResumesForUser(session.userId),
      listTailoredResumesForUser(session.userId),
      listFullCoverLettersForUser(session.userId),
      listSavedJobIds(session.userId),
      listHiddenJobIds(session.userId),
      listResultsForUser(session.userId),
    ])

    const data = {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email, createdAt: user.createdAt, consentAcceptedAt: user.consentAcceptedAt },
      profile,
      jobPreferences,
      resumes: resumes.map(r => ({
        id: r.id, originalFilename: r.originalFilename, fileSize: r.fileSize, contentType: r.contentType,
        parsedProfile: r.parsedProfile, version: r.version, createdAt: r.createdAt,
        note: `Download the original file via /api/resumes/${r.id}/file while signed in.`,
      })),
      tailoredResumes,
      coverLetters,
      savedJobIds: [...savedJobIds],
      hiddenJobIds: [...hiddenJobIds],
      roastResults: roasts,
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="my-data-export.json"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[account/export] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
