import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { validateResumeFile, MAX_RESUME_FILE_SIZE, type DetectedFileType } from '@/lib/fileValidation'
import { parseResumeToProfile } from '@/lib/resumeParsing'
import { vercelBlobStorage } from '@/lib/storage'
import { createResume, setParsedProfile, listResumesForUser } from '@/lib/db/resumes'
import { checkRateLimit } from '@/lib/rateLimit'
import { ensureDomMatrixPolyfill } from '@/lib/pdfPolyfill'

// Upload is comparatively expensive (file storage + an LLM call) — throttle
// harder than auth endpoints. Per-user (requires a session anyway).
const UPLOAD_LIMIT = { max: 10, windowSeconds: 60 * 60 }

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}

// Inlined here rather than in a shared lib module — pdf-parse's PDF.js
// dependency throws ("Object.defineProperty called on non-object") when
// dynamically imported from lib/, but works fine imported directly inside a
// route handler (same pattern app/api/analyze/route.ts already uses
// successfully). See lib/resumeParsing.ts's top comment before moving this.
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

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const resumes = await listResumesForUser(session.userId)
    // Never return parsedProfile content or filePathname in a list view —
    // list is just metadata for picking which resume to open.
    return NextResponse.json({
      resumes: resumes.map(r => ({
        id: r.id,
        originalFilename: r.originalFilename,
        fileSize: r.fileSize,
        version: r.version,
        createdAt: r.createdAt,
        hasParsedProfile: r.parsedProfile !== null,
      })),
    })
  } catch (err) {
    console.error('[resumes] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rate = await checkRateLimit(`resume-upload:user:${session.userId}`, UPLOAD_LIMIT.max, UPLOAD_LIMIT.windowSeconds)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 })
    }
    if (file.size > MAX_RESUME_FILE_SIZE) {
      return NextResponse.json({ error: 'TOO_LARGE' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const validation = validateResumeFile(buffer, file.name)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }

    const contentType = validation.detectedType === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    const stored = await vercelBlobStorage.upload(session.userId, file.name, buffer, contentType)

    const resume = await createResume(session.userId, {
      filePathname: stored.pathname,
      originalFilename: file.name,
      fileSize: file.size,
      contentType,
    })

    // Parse synchronously — keeps the flow simple (one request = uploaded +
    // parsed, ready for the review screen) at the cost of a slower response
    // while the LLM call runs. If parsing fails, the upload itself still
    // succeeded — the resume row exists with parsedProfile: null, and the
    // client can retry parsing without re-uploading (not wired up yet,
    // flagged as a gap).
    let parseError: string | undefined
    try {
      const text = await extractResumeText(buffer, validation.detectedType)
      const result = await parseResumeToProfile(text)
      if (result.ok) {
        await setParsedProfile(resume.id, result.profile)
      } else {
        parseError = result.error
      }
    } catch (err) {
      console.error('[resumes] parsing failed:', err instanceof Error ? err.message : String(err))
      parseError = 'API_ERROR'
    }

    return NextResponse.json({
      id: resume.id,
      version: resume.version,
      parsed: !parseError,
      parseError,
    })
  } catch (err) {
    console.error('[resumes] POST failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
