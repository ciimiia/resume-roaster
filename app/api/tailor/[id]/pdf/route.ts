import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getTailoredResumeForUser } from '@/lib/db/tailoredResumes'
import { getProfileForUser } from '@/lib/db/profiles'
import { buildResumeHtml, type ResumeTemplateId } from '@/lib/tailoring/pdf/templates'
import { renderHtmlToPdf } from '@/lib/tailoring/pdf/render'

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
