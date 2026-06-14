import { NextRequest, NextResponse } from 'next/server'
import { RESULTS, SAMPLE_TEXT } from '@/lib/data'
import type { ModeId } from '@/lib/types'

const SYSTEM_PROMPTS: Record<ModeId, string> = {
  roast: `You are a brutally honest, witty resume critic. Roast this resume mercilessly but helpfully.
Be funny, sharp, and specific. Point out every cliché, vague claim, and missed opportunity.`,

  coach: `You are a senior recruiter and career coach with 15+ years of experience.
Give professional, constructive, actionable feedback. Be encouraging but specific and direct.`,

  intl: `You are an international hiring specialist. Evaluate this resume for global remote roles and
international job markets. Focus on clarity for non-native readers, remote-work signals, and universal standards.`,
}

const USER_PROMPT = (mode: ModeId, resumeText: string) => `
Analyze this resume and return ONLY a valid JSON object — no markdown, no code fences, no extra text.

Resume:
"""
${resumeText}
"""

Return exactly this shape:
{
  "score": <integer 0-100>,
  "grade": <"A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F">,
  "verdict": <one punchy sentence>,
  "summary": <2-3 sentence paragraph>,
  "sections": [
    { "label": <string>, "score": <integer 0-100>, "note": <one sentence> }
  ],
  "wins": [<string>, ...],
  "fixes": [<string>, ...],
  "flags": [<string>, ...]
}

Requirements:
- sections: exactly 5 items with labels relevant to the "${mode}" analysis mode
- wins: 2-3 genuine strengths
- fixes: 3-4 specific, actionable improvements
- flags: 1-3 red flags or urgent issues (can be empty array if none)
- All text must match the tone of the "${mode}" mode
`

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const mode = ((formData.get('mode') as string) || 'roast') as ModeId

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not set — falling back to static data')
    return NextResponse.json(RESULTS[mode] ?? RESULTS.roast)
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://resume-roaster.vercel.app',
        'X-Title': 'Resume Roaster',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[mode] },
          { role: 'user', content: USER_PROMPT(mode, SAMPLE_TEXT) },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''

    // Strip markdown code fences if the model wrapped the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err) {
    console.error('OpenRouter error — falling back to static data:', err)
    return NextResponse.json(RESULTS[mode] ?? RESULTS.roast)
  }
}
