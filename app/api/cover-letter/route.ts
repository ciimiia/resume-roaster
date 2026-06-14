import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { kv } from '@/lib/kv'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

export interface CoverLetterSummary {
  id: string
  preview: string  // first 120 chars of the letter
  savedAt: string
}

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
  const { resumeText, jobDescription } = await req.json() as {
    resumeText: string
    jobDescription: string
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://resume-roaster.vercel.app',
      'X-Title': 'Resume Roaster',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildPrompt(resumeText, jobDescription) },
      ],
      temperature: 0.75,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('[cover-letter] OpenRouter error', response.status, body)
    return NextResponse.json({ error: `OpenRouter ${response.status}: ${body}` }, { status: 502 })
  }

  const data = await response.json()
  console.log('[cover-letter] raw response:', JSON.stringify(data).slice(0, 400))

  const letter: string = data.choices?.[0]?.message?.content?.trim() ?? ''

  if (!letter) {
    console.error('[cover-letter] empty letter, full data:', JSON.stringify(data))
    return NextResponse.json({ error: `No content returned. Model response: ${JSON.stringify(data)}` }, { status: 502 })
  }

  // Persist to user's account if logged in
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  let savedId: string | undefined

  if (session) {
    savedId = crypto.randomUUID().slice(0, 8)
    const summary: CoverLetterSummary = {
      id: savedId,
      preview: letter.slice(0, 120),
      savedAt: new Date().toISOString(),
    }
    await kv.set(`coverletter:${savedId}`, { id: savedId, letter, userId: session.userId, savedAt: summary.savedAt })
    const existing = await kv.get<CoverLetterSummary[]>(`user:coverletters:${session.userId}`) ?? []
    await kv.set(`user:coverletters:${session.userId}`, [summary, ...existing].slice(0, 50))
  }

  return NextResponse.json({ letter, savedId })
}
