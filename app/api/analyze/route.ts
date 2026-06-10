import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PROMPTS: Record<string, string> = {
  roast: `You are a brutally honest, witty resume roaster. Analyze this resume and respond ONLY with valid JSON matching this exact shape:
{
  "score": <number 0-100>,
  "grade": "<letter grade A/B/C/D/F with optional +/-  >",
  "verdict": "<one punchy sentence>",
  "summary": "<2-3 sentence paragraph>",
  "sections": [{"label":"<name>","score":<0-100>,"note":"<specific observation>"}],
  "wins": ["<specific strength>"],
  "fixes": ["<specific actionable fix>"],
  "flags": ["<specific red flag>"]
}
Be savage but specific. No markdown, no preamble.`,

  coach: `You are a senior career coach. Analyze this resume and respond ONLY with valid JSON:
{
  "score": <number 0-100>,
  "grade": "<letter grade>",
  "verdict": "<one professional sentence>",
  "summary": "<2-3 sentence paragraph>",
  "sections": [{"label":"<name>","score":<0-100>,"note":"<observation>"}],
  "wins": ["<strength>"],
  "fixes": ["<fix>"],
  "flags": ["<issue>"]
}
Be constructive and specific. No markdown, no preamble.`,

  intl: `You are an international remote hiring expert. Analyze this resume for global job applications and respond ONLY with valid JSON:
{
  "score": <number 0-100>,
  "grade": "<letter grade>",
  "verdict": "<one sentence about global readiness>",
  "summary": "<2-3 sentence paragraph>",
  "sections": [{"label":"<name>","score":<0-100>,"note":"<observation>"}],
  "wins": ["<strength>"],
  "fixes": ["<fix>"],
  "flags": ["<issue>"]
}
Focus on remote signals, localization, and international norms. No markdown.`,
}

const SAMPLE_TEXT = `Alex Rivera
Senior Product Engineer
alex.rivera@email.com · Lisbon, PT · github.com/arivera

EXPERIENCE

Lead Engineer — TechCorp (2021–Present)
- Responsible for building and maintaining core product features
- Leveraged synergies to ideate solutions with cross-functional teams
- Team player and hard worker, detail-oriented
- Responsible for code reviews and mentoring junior developers

Software Engineer — StartupXYZ (2019–2021)
- Responsible for frontend development using React
- Built reusable UI components
- Collaborated with design team

PROJECTS
Open-source CLI tool — 500+ GitHub stars
Personal portfolio website built with Next.js

SKILLS
JavaScript, TypeScript, React, Node.js, Python, SQL, Git

EDUCATION
BSc Computer Science — University of Lisbon (2015–2019)`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const mode     = (formData.get('mode') as string) || 'roast'
    const useSample = formData.get('useSampleText') === 'true'

    let text: string

    if (useSample || !formData.get('file')) {
      text = SAMPLE_TEXT
    } else {
      // Parse PDF server-side
      const file   = formData.get('file') as File
      const buffer = Buffer.from(await file.arrayBuffer())

      try {
        // Dynamic import to avoid bundling issues
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        text = data.text
      } catch {
        // If pdf-parse fails fall back to filename as placeholder
        text = `Resume file: ${file.name}\n[Could not extract text — using filename only]`
      }
    }

    const prompt = PROMPTS[mode] ?? PROMPTS.roast

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `${prompt}\n\nResume text:\n${text}` }],
    })

    const raw   = (message.content[0] as { text: string }).text
    const clean = raw.replace(/```json|```/g, '').trim()

    const result = JSON.parse(clean)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[analyze]', err)
    return NextResponse.json(
      { error: 'Analysis failed', detail: String(err) },
      { status: 500 }
    )
  }
}
