import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'
import type { Post, Block } from '@/lib/posts'

// ── Topic pool ──────────────────────────────────────────────────────────────
const TOPICS: { topic: string; tag: Post['tag'] }[] = [
  { topic: 'How to explain a career gap on your resume without it costing you the interview', tag: 'ATS' },
  { topic: 'The perfect LinkedIn profile for job seekers in 2026 — what recruiters actually look at', tag: 'ATS' },
  { topic: 'How to write a resume when you have no experience — entry-level strategies that work', tag: 'ATS' },
  { topic: 'How to tailor your resume for every job application without starting from scratch', tag: 'ATS' },
  { topic: 'Cover letter mistakes that cost you the interview — and how to avoid them', tag: 'Developers' },
  { topic: 'How to get a job referral and why it triples your chances of getting hired', tag: 'ATS' },
  { topic: 'Salary negotiation after a job offer: how to ask for more without losing the offer', tag: 'ATS' },
  { topic: 'The technical interview preparation checklist for software developers', tag: 'Developers' },
  { topic: 'How to write a standout professional summary that makes recruiters keep reading', tag: 'ATS' },
  { topic: 'Resume length: one page vs. two pages — the definitive answer for 2026', tag: 'ATS' },
  { topic: 'Portfolio vs. resume: what software developers actually need to get hired in 2026', tag: 'Developers' },
  { topic: 'How to use LinkedIn to get recruiters to reach out to you instead of the other way around', tag: 'Remote' },
  { topic: 'Freelance to full-time: how to position contract and consulting work on your resume', tag: 'Remote' },
  { topic: 'The hidden job market: how to find and land jobs that are never publicly posted', tag: 'Remote' },
  { topic: 'How async-first remote teams actually work — and what it means for your job search', tag: 'Remote' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────
function slugify(title: string): string {
  const full = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  if (full.length <= 70) return full
  // Truncate at the last word boundary before 70 chars
  const cut = full.slice(0, 70)
  const lastDash = cut.lastIndexOf('-')
  return lastDash > 30 ? cut.slice(0, lastDash) : cut
}

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

// ── SVG cover image ──────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, { accent: string; accent2: string }> = {
  ATS:        { accent: '#FF6B35', accent2: '#FF3D5A' },
  Developers: { accent: '#4D9FFF', accent2: '#7B5CFA' },
  Remote:     { accent: '#4DCC88', accent2: '#00C9B1' },
}

function buildCoverSvg(title: string, tag: string): string {
  const { accent, accent2 } = TAG_COLORS[tag] ?? { accent: '#FF6B35', accent2: '#FF3D5A' }

  // Wrap title into lines of ~36 chars for the SVG text
  const words = title.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 36) { lines.push(line.trim()); line = word }
    else line = (line + ' ' + word).trim()
  }
  if (line) lines.push(line.trim())
  const maxLines = 3
  const displayLines = lines.slice(0, maxLines)
  if (lines.length > maxLines) displayLines[maxLines - 1] = displayLines[maxLines - 1].replace(/.{3}$/, '...')

  const lineHeight = 52
  const textStartY = 260 - ((displayLines.length - 1) * lineHeight) / 2

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g1" cx="25%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="80%" cy="75%" r="50%">
      <stop offset="0%" stop-color="${accent2}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${accent2}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="stripe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent2}"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="#0E0809"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <!-- Grid lines -->
  <g stroke="rgba(255,255,255,0.04)" stroke-width="1">
    ${Array.from({ length: 7 }, (_, i) => `<line x1="${(i + 1) * 150}" y1="0" x2="${(i + 1) * 150}" y2="630"/>`).join('')}
    ${Array.from({ length: 4 }, (_, i) => `<line x1="0" y1="${(i + 1) * 126}" x2="1200" y2="${(i + 1) * 126}"/>`).join('')}
  </g>
  <!-- Accent stripe -->
  <rect x="80" y="180" width="5" height="${displayLines.length * lineHeight + 20}" fill="url(#stripe)" rx="3"/>
  <!-- Title lines -->
  ${displayLines.map((l, i) => `<text x="108" y="${textStartY + i * lineHeight}" font-family="Georgia,serif" font-size="44" font-weight="700" fill="white" opacity="0.95">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`).join('\n  ')}
  <!-- Tag pill -->
  <rect x="108" y="${textStartY + displayLines.length * lineHeight + 24}" width="${tag.length * 11 + 28}" height="34" rx="17" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="1" stroke-opacity="0.5"/>
  <text x="${108 + (tag.length * 11 + 28) / 2}" y="${textStartY + displayLines.length * lineHeight + 47}" font-family="monospace" font-size="13" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="1">${tag}</text>
  <!-- Flame + brand -->
  <text x="1110" y="590" font-size="32" text-anchor="middle">🔥</text>
  <text x="1110" y="614" font-family="Georgia,serif" font-size="13" fill="rgba(255,255,255,0.35)" text-anchor="middle">Resume Roaster</text>
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// ── Auth guard ───────────────────────────────────────────────────────────────
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 })
  }

  // Pick a topic that hasn't been used recently
  const usedSlugs = (await kv.get<string[]>('blog:posts:all')) ?? []
  const usedTopics = new Set(
    (await Promise.all(
      usedSlugs.slice(0, 30).map(s => kv.get<Post>(`blog:post:${s}`))
    )).filter(Boolean).map(p => p!.title.toLowerCase().slice(0, 30))
  )

  const available = TOPICS.filter(t => !usedTopics.has(t.topic.toLowerCase().slice(0, 30)))
  const pool = available.length > 0 ? available : TOPICS
  const chosen = pool[Math.floor(Math.random() * pool.length)]

  // ── Prompt ────────────────────────────────────────────────────────────────
  const prompt = `Write an expert, detailed blog post about: "${chosen.topic}"

The audience is job seekers and professionals wanting to improve their resume and job search results.

Return ONLY a valid JSON object with this exact shape — no markdown, no explanation, just the JSON:

{
  "title": "string — compelling, specific title (not the topic verbatim)",
  "excerpt": "string — 1-2 sentence summary that makes someone want to read it (max 180 chars)",
  "readTime": number — estimated minutes to read (integer, 5-10),
  "content": [
    Block, Block, ...
  ]
}

A Block is one of these shapes:
- { "type": "p", "text": "paragraph text" }
- { "type": "h2", "text": "section heading" }
- { "type": "h3", "text": "subheading" }
- { "type": "ul", "items": ["item 1", "item 2", "item 3"] }
- { "type": "ol", "items": ["step 1", "step 2"] }
- { "type": "tip", "text": "a practical, specific pro tip" }
- { "type": "quote", "text": "a memorable, insightful quote or takeaway" }

Requirements:
- 6-9 sections total (h2 blocks), each with 1-3 paragraph or list blocks beneath
- Include at least 2 tip or quote blocks
- Be specific and practical — no generic advice. Real examples, real numbers where possible.
- Do NOT wrap the JSON in code fences or add any text before/after it.`

  // ── Call OpenRouter ───────────────────────────────────────────────────────
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://resume-roaster.vercel.app',
      'X-Title': 'Resume Roaster Blog Generator',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 3000,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('[generate-post] OpenRouter error', response.status, body)
    return NextResponse.json({ error: `OpenRouter ${response.status}: ${body}` }, { status: 502 })
  }

  const data = await response.json()
  console.log('[generate-post] OpenRouter status:', response.status)
  console.log('[generate-post] full response:', JSON.stringify(data).slice(0, 1000))

  const msg = data.choices?.[0]?.message ?? {}
  const raw: string = (msg.content ?? msg.reasoning ?? '').trim()
  console.log('[generate-post] raw content length:', raw.length)
  console.log('[generate-post] raw content preview:', raw.slice(0, 300))

  if (!raw) {
    console.error('[generate-post] Empty content. Full data:', JSON.stringify(data))
    return NextResponse.json({ error: 'Empty response from model', debug: data }, { status: 502 })
  }

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let parsed: { title: string; excerpt: string; readTime: number; content: Block[] }
  try {
    parsed = JSON.parse(stripCodeFences(raw))
  } catch {
    console.error('[generate-post] JSON parse failed:', raw.slice(0, 300))
    return NextResponse.json({ error: 'Model returned invalid JSON', raw: raw.slice(0, 500) }, { status: 502 })
  }

  // Basic validation
  if (!parsed.title || !Array.isArray(parsed.content) || parsed.content.length === 0) {
    return NextResponse.json({ error: 'Model returned incomplete post structure' }, { status: 502 })
  }

  // ── Build cover image (SVG data URL, no external dependency) ─────────────
  const coverImage = buildCoverSvg(parsed.title, chosen.tag)

  // ── Build Post object ─────────────────────────────────────────────────────
  const slug = slugify(parsed.title)
  const post: Post = {
    slug,
    title: parsed.title,
    excerpt: parsed.excerpt ?? '',
    date: new Date().toISOString().split('T')[0],
    readTime: parsed.readTime ?? 6,
    tag: chosen.tag,
    content: parsed.content,
    coverImage,
  }

  // ── Save to KV ────────────────────────────────────────────────────────────
  await kv.set(`blog:post:${slug}`, post)
  const existingSlugs = (await kv.get<string[]>('blog:posts:all')) ?? []
  if (!existingSlugs.includes(slug)) {
    await kv.set('blog:posts:all', [slug, ...existingSlugs].slice(0, 100))
  }

  console.log('[generate-post] Created post:', slug)
  return NextResponse.json({ ok: true, post })
}
