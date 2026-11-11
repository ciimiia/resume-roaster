import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { saveCoverLetter } from '@/lib/db/coverLetters'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { env } from '@/lib/env'
import { PRODUCT } from '@/lib/config'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'
import { readJsonWithLimit } from '@/lib/requestSize'

export type { CoverLetterSummary } from '@/lib/db/coverLetters'

// Launch-readiness security pass: this route is callable anonymously (no
// session required — it only checks session afterward, to decide whether
// to persist) and calls a paid AI model, so it needs the same IP-based
// throttling as /api/analyze — previously had none at all. Also previously
// used 'openrouter/free' with no data_collection constraint, inconsistent
// with every other LLM call in this app (resume text is personal data);
// switched to the same paid-model + deny-training pattern.
const IP_LIMIT = { max: 8, windowSeconds: 10 * 60 }
const MAX_BODY_BYTES = 64 * 1024

const SYSTEM = `You are an expert cover letter writer with 15+ years of experience in recruiting and career coaching.
You write concise, compelling, highly personalized cover letters that match candidates to specific roles.`

const buildPrompt = (resumeText: string, jobDescription: string) => `
Write a tailored, professional cover letter based on the resume and job description below.

RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""

Requirements:
- 3–4 paragraphs, no bullet points
- Open with a strong hook that directly connects the candidate's top strength to this specific role
- Middle paragraphs: highlight 2–3 concrete experiences or skills from the resume that match the job requirements, with specific examples where possible
- Close with genuine enthusiasm for the company/role and a clear call to action
- Tone: professional, confident, and human — not stiff or corporate
- Do NOT include date, address, subject line, or signature — start directly with the salutation (e.g. "Dear Hiring Manager,")
- Return ONLY the cover letter text, nothing else
`

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const ipRate = await checkRateLimit(`coverletter-legacy:ip:${ip}`, IP_LIMIT.max, IP_LIMIT.windowSeconds)
  if (!ipRate.allowed) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  const parsed = await readJsonWithLimit<{ resumeText: string; jobDescription: string }>(req, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.error === 'TOO_LARGE' ? 413 : 400 })
  }
  const { resumeText, jobDescription } = parsed.data

  const apiKey = env.openRouterApiKey
  if (!apiKey) {
    return NextResponse.json({ error: 'NO_API_KEY' }, { status: 500 })
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.siteUrl,
        'X-Title': PRODUCT.name,
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt(resumeText, jobDescription) },
        ],
        temperature: 0.75,
        max_tokens: 1200,
        reasoning: { enabled: false },
        // Resume text is personal data — route only to providers that
        // don't retain or train on prompts, same constraint as every
        // other LLM call in this app.
        provider: { data_collection: 'deny' },
      }),
    })

    if (!response.ok) {
      // Never echo the raw provider response back to the client or into
      // logs — it can quote the input text (resume/job content) verbatim.
      console.error('[cover-letter] OpenRouter error, status:', response.status)
      return NextResponse.json({ error: 'API_ERROR' }, { status: 502 })
    }

    const data = await response.json()
    const letter: string = data.choices?.[0]?.message?.content?.trim() ?? ''

    if (!letter) {
      console.error('[cover-letter] empty letter returned')
      return NextResponse.json({ error: 'INVALID_RESPONSE' }, { status: 502 })
    }

    // Persist to user's account if logged in
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    const session = token ? await verifySession(token) : null
    let savedId: string | undefined

    if (session) {
      try {
        savedId = await saveCoverLetter(session.userId, letter)
      } catch (err) {
        console.error('[cover-letter] failed to persist, returning letter unsaved:', err)
      }
    }

    return NextResponse.json({ letter, savedId })
  } catch (err) {
    console.error('[cover-letter] unexpected failure:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'API_ERROR' }, { status: 502 })
  }
}
