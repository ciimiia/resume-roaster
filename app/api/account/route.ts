import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { listResumesForUser } from '@/lib/db/resumes'
import { deleteUserAccount } from '@/lib/db/users'
import { vercelBlobStorage } from '@/lib/storage'
import { getDb, schema } from '@/lib/db'
import { like } from 'drizzle-orm'

/**
 * Full "Delete my account" — permanently removes the user row and
 * everything that references it. Every table with a userId FK to
 * `users.id` has `onDelete: 'cascade'` (lib/db/schema.ts — confirmed by
 * grepping every `references(() => users.id, ...)` in that file), so
 * deleting the user row cascades to: profile, job preferences, resumes,
 * tailored resumes (+ their cover letters), standalone cover letters,
 * saved/hidden jobs, shared roast results, and password-reset tokens.
 *
 * Two things the FK cascade can't reach, handled explicitly first:
 *  - Vercel Blob files (external storage, not a DB row)
 *  - rate_limits rows (keyed by arbitrary strings like
 *    `tailor:minute:${userId}`, not a real FK relationship)
 *
 * The session cookie is cleared in the response regardless of outcome
 * below the user row being gone — "sessions" here are stateless signed
 * cookies (lib/session.ts), not a server-side table, so there's nothing
 * else to invalidate.
 */
export async function DELETE() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const resumes = await listResumesForUser(session.userId)
    const blobResults = await Promise.allSettled(resumes.map(r => vercelBlobStorage.delete(r.filePathname)))
    const blobFailures = blobResults.filter(r => r.status === 'rejected').length
    if (blobFailures > 0) {
      console.error(`[account] DELETE: ${blobFailures}/${resumes.length} blob file(s) failed to delete`)
    }

    const db = getDb()
    await db.delete(schema.rateLimits).where(like(schema.rateLimits.key, `%${session.userId}%`))

    await deleteUserAccount(session.userId)

    const res = NextResponse.json({ ok: true })
    res.cookies.delete(SESSION_COOKIE)
    return res
  } catch (err) {
    console.error('[account] DELETE failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
