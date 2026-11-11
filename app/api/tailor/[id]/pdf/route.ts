import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getTailoredResumeForUser } from '@/lib/db/tailoredResumes'
import { getProfileForUser } from '@/lib/db/profiles'
import { buildResumeHtml, type ResumeTemplateId } from '@/lib/tailoring/pdf/templates'
import { renderHtmlToPdf } from '@/lib/tailoring/pdf/render'
import { checkRateLimit } from '@/lib/rateLimit'
import { PDF_WINDOW_LIMIT, PDF_DAILY_LIMIT } from '@/lib/tailoring/caps'

export const maxDuration = 60 // headless Chromium launch + render can take a few seconds, well under the limit with room to spare

function isTemplateId(v: string | null): v is ResumeTemplateId {
  return v === 'modern' || v === 'classic'
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const tailored = await getTailoredResumeForUser(id, session.userId)
    if (!tailored) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    // After ownership, before launching Chromium — a full browser process
    // per request is real CPU/memory cost even though it doesn't call a
    // paid API, see lib/tailoring/caps.ts's PDF_WINDOW_LIMIT comment. Same
    // "pdf:*" bucket as app/api/cover-letter/[id]/pdf/route.ts — both
    // routes launch Chromium, so the cap is shared per user across them
    // rather than doubled by giving each route its own budget.
    const [windowRate, dailyRate] = await Promise.all([
      checkRateLimit(`pdf:window:${session.userId}`, PDF_WINDOW_LIMIT.max, PDF_WINDOW_LIMIT.windowSeconds),
      checkRateLimit(`pdf:day:${session.userId}`, PDF_DAILY_LIMIT.max, PDF_DAILY_LIMIT.windowSeconds),
    ])
    if (!windowRate.allowed || !dailyRate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const profile = await getProfileForUser(session.userId)
    if (!profile) return NextResponse.json({ error: 'PROFILE_NOT_APPROVED' }, { status: 409 })

    const templateParam = req.nextUrl.searchParams.get('template')
    const template: ResumeTemplateId = isTemplateId(templateParam) ? templateParam : 'modern'
    const lang = req.nextUrl.searchParams.get('lang') === 'fa' ? 'fa' : 'en'

    const html = buildResumeHtml({
      contact: profile.contact,
      tailored: tailored.tailoredProfile,
      education: profile.education,
      certifications: profile.certifications,
      languages: profile.languages,
      projects: profile.projects,
      template, lang,
    })

    const pdf = await renderHtmlToPdf(html)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resume-${template}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[tailor/[id]/pdf] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
