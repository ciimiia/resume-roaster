import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { deleteAllResumesForUser } from '@/lib/db/resumes'
import { deleteProfileForUser } from '@/lib/db/profiles'
import { deleteJobPreferencesForUser } from '@/lib/db/jobPreferences'
import { vercelBlobStorage } from '@/lib/storage'

/**
 * "Delete my data" — removes resumes (DB rows + Blob files), the approved
 * profile, and job preferences for the signed-in user. Does NOT delete the
 * user's account/login or their roast history (shared_results, which
 * un-links from any deleted resume via onDelete 'set null' rather than
 * cascading) — this endpoint is scoped to candidate-profile data
 * specifically, per what was asked ("removes resumes, files in Blob,
 * profile and preferences"), not full account deletion.
 */
export async function DELETE() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const filePathnames = await deleteAllResumesForUser(session.userId)

    const blobResults = await Promise.allSettled(filePathnames.map(p => vercelBlobStorage.delete(p)))
    const blobFailures = blobResults.filter(r => r.status === 'rejected').length
    if (blobFailures > 0) {
      // DB rows are already gone (source of truth for "does this exist"),
      // log but don't fail the request over an orphaned blob.
      console.error(`[account/data] DELETE: ${blobFailures}/${filePathnames.length} blob file(s) failed to delete`)
    }

    await Promise.all([
      deleteProfileForUser(session.userId),
      deleteJobPreferencesForUser(session.userId),
    ])

    return NextResponse.json({ ok: true, deletedResumes: filePathnames.length })
  } catch (err) {
    console.error('[account/data] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
