import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getCoverLetterForUser } from '@/lib/db/coverLetters'
import { getProfileForUser } from '@/lib/db/profiles'
import { buildCoverLetterHtml } from '@/lib/tailoring/pdf/templates'
import { renderHtmlToPdf } from '@/lib/tailoring/pdf/render'
import { checkRateLimit } from '@/lib/rateLimit'
import { PDF_WINDOW_LIMIT, PDF_DAILY_LIMIT } from '@/lib/tailoring/caps'

export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const letter = await getCoverLetterForUser(id, session.userId)
    if (!letter) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    // Shared "pdf:*" bucket with app/api/tailor/[id]/pdf/route.ts — see
    // that file's comment.
    const [windowRate, dailyRate] = await Promise.all([
      checkRateLimit(`pdf:window:${session.userId}`, PDF_WINDOW_LIMIT.max, PDF_WINDOW_LIMIT.windowSeconds),
      checkRateLimit(`pdf:day:${session.userId}`, PDF_DAILY_LIMIT.max, PDF_DAILY_LIMIT.windowSeconds),
    ])
    if (!windowRate.allowed || !dailyRate.allowed) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const profile = await getProfileForUser(session.userId)
    const lang = req.nextUrl.searchParams.get('lang') === 'fa' ? 'fa' : 'en'

    const html = buildCoverLetterHtml({ name: profile?.contact.name ?? '', letter: letter.letter, lang })
    const pdf = await renderHtmlToPdf(html)

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="cover-letter.pdf"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[cover-letter/[id]/pdf] GET failed:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
