import { NextRequest, NextResponse } from 'next/server'

const SYSTEM = `You are an expert cover letter writer with 15+ years of experience in recruiting and career coaching.
You write concise, compelling, highly personalized cover letters that match candidates to specific roles.`

const prompt = (resumeText: string, jobDescription: string) => `
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
        { role: 'user', content: prompt(resumeText, jobDescription) },
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

  return NextResponse.json({ letter })
}
