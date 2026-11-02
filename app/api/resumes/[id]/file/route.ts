import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getResumeForUser } from '@/lib/db/resumes'
import { vercelBlobStorage } from '@/lib/storage'

/**
 * Streams a resume file's bytes through this server. This is the ONLY way
 * a resume file is ever served — there is no public Blob URL anywhere in
 * the client. Ownership is checked here (via getResumeForUser) on every
 * request, not cached, not assumed from a prior check.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const resume = await getResumeForUser(id, session.userId)
    if (!resume) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    const file = await vercelBlobStorage.download(resume.filePathname)
    if (!file) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    return new NextResponse(file.stream, {
      headers: {
        'Content-Type': file.contentType ?? resume.contentType,
        'Content-Disposition': `attachment; filename="${resume.originalFilename.replace(/"/g, '')}"`,
        ...(file.size ? { 'Content-Length': String(file.size) } : {}),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[resumes/[id]/file] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
