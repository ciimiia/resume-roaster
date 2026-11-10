import { NextRequest, NextResponse } from 'next/server'
import { RESULTS, SAMPLE_TEXT } from '@/lib/data'
import type { ModeId } from '@/lib/types'
import { env } from '@/lib/env'
import { PRODUCT } from '@/lib/config'
import { ensureDomMatrixPolyfill } from '@/lib/pdfPolyfill'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'
import { MAX_RESUME_FILE_SIZE } from '@/lib/fileValidation'
import { IP_LIMIT, GLOBAL_DAILY_LIMIT, MAX_RESUME_TEXT_CHARS } from '@/lib/analyzeRateLimit'

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

async function extractPdfText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  ensureDomMatrixPolyfill() // see lib/pdfPolyfill.ts — pdfjs-dist needs this on Vercel's runtime, not just locally
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return result.text.trim()
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const [ipRate, globalRate] = await Promise.all([
    checkRateLimit(`analyze:ip:${ip}`, IP_LIMIT.max, IP_LIMIT.windowSeconds),
    checkRateLimit('analyze:global:day', GLOBAL_DAILY_LIMIT.max, GLOBAL_DAILY_LIMIT.windowSeconds),
  ])
  if (!ipRate.allowed || !globalRate.allowed) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  const formData = await req.formData()
  const mode = ((formData.get('mode') as string) || 'roast') as ModeId
  const useSample = formData.get('useSampleText') === 'true'
  const file = formData.get('file') as File | null

  let resumeText = SAMPLE_TEXT

  if (!useSample && file) {
    if (file.size > MAX_RESUME_FILE_SIZE) {
      // Checked via File.size, before ever buffering the upload into
      // memory — same cap as the authenticated resume-upload flow
      // (lib/fileValidation.ts), reused here rather than duplicated.
      console.warn('Uploaded file exceeds size cap — using sample')
    } else {
      try {
        const extracted = await extractPdfText(file)
        if (extracted.length > 50) {
          resumeText = extracted.slice(0, MAX_RESUME_TEXT_CHARS)
        } else {
          console.warn('PDF text extraction returned too little text — using sample')
        }
      } catch (err) {
        console.error('PDF parse error — using sample text:', err)
      }
    }
  }

  const apiKey = env.openRouterApiKey
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
        'HTTP-Referer': env.siteUrl,
        'X-Title': PRODUCT.name,
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[mode] },
          { role: 'user', content: USER_PROMPT(mode, resumeText) },
        ],
        temperature: 0.7,
        max_tokens: 2200,
        // Some free models behind "openrouter/free" spend the whole token
        // budget on hidden chain-of-thought and never emit the actual JSON
        // answer. Disabling reasoning routes to a model that returns content.
        reasoning: { enabled: false },
        // Resume text is personal data — route only to providers that don't
        // retain or train on prompts (requires a paid model; see env.openRouterModel).
        provider: { data_collection: 'deny' },
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    const msg = data.choices?.[0]?.message ?? {}
    const raw: string = (msg.content ?? msg.reasoning ?? '').trim()

    // Strip markdown code fences if the model wrapped the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err) {
    console.error('OpenRouter error — falling back to static data:', err)
    return NextResponse.json(RESULTS[mode] ?? RESULTS.roast)
  }
}
