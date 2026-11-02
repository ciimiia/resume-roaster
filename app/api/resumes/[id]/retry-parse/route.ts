import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getResumeForUser, setParsedProfile } from '@/lib/db/resumes'
import { vercelBlobStorage } from '@/lib/storage'
import { parseResumeToProfile } from '@/lib/resumeParsing'
import { checkRateLimit } from '@/lib/rateLimit'
import { ensureDomMatrixPolyfill } from '@/lib/pdfPolyfill'
import type { DetectedFileType } from '@/lib/fileValidation'

// Same budget as upload — re-parsing is the same cost (an LLM call) minus
// the storage write, so there's no reason to allow it more often.
const RETRY_LIMIT = { max: 10, windowSeconds: 60 * 60 }

// Duplicated from app/api/resumes/route.ts rather than shared — see that
// file's comment: pdf-parse breaks when dynamically imported from a lib
// module, only works inlined directly in a route handler.
async function extractResumeText(buffer: Buffer, type: DetectedFileType): Promise<string> {
  if (type === 'pdf') {
    ensureDomMatrixPolyfill()
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text.trim()
  }
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value.trim()
}

async function requireSession() {
  const token = cookies().get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

/**
 * Re-runs extraction + parsing for an already-uploaded resume, from the
 * stored file — no re-upload needed. For the case where upload succeeded
 * but parsing failed (bad text extraction, LLM/API error, etc).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const resume = await getResumeForUser(params.id, session.userId)
    if (!resume) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    const rate = await checkRateLimit(`resume-retry-parse:user:${session.userId}`, RETRY_LIMIT.max, RETRY_LIMIT.windowSeconds)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const file = await vercelBlobStorage.download(resume.filePathname)
    if (!file) return NextResponse.json({ error: 'FILE_MISSING' }, { status: 404 })

    const buffer = Buffer.from(await new Response(file.stream).arrayBuffer())
    const detectedType: DetectedFileType = resume.contentType === 'application/pdf' ? 'pdf' : 'docx'

    const text = await extractResumeText(buffer, detectedType)
    const result = await parseResumeToProfile(text)
    if (!result.ok) {
      return NextResponse.json({ parsed: false, parseError: result.error })
    }

    await setParsedProfile(resume.id, result.profile)
    return NextResponse.json({ parsed: true })
  } catch (err) {
    console.error('[resumes/[id]/retry-parse] POST failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
