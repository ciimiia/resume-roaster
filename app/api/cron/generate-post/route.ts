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

  const raw: string = data.choices?.[0]?.message?.content?.trim() ?? ''
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
