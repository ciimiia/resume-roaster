import { notFound } from 'next/navigation'
import { kv } from '@/lib/kv'
import type { Metadata } from 'next'
import type { SavedResult } from '@/app/api/save/route'
import SharedResult from '@/components/SharedResult'
import { MODES } from '@/lib/data'

async function load(id: string): Promise<SavedResult | null> {
  try {
    return await kv.get<SavedResult>(`result:${id}`)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const saved = await load(params.id)
  if (!saved) return { title: 'Resume Roaster' }

  const { result, mode } = saved
  const m = MODES[mode]
  const title = `"${result.verdict}" — Resume Roaster`
  const description = `${m.glyph} ${m.name} · Score: ${result.score}/100 (${result.grade}) — ${result.summary.slice(0, 140)}…`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Resume Roaster',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function SharedPage({ params }: { params: { id: string } }) {
  const saved = await load(params.id)
  if (!saved) notFound()

  return <SharedResult mode={saved.mode} result={saved.result} />
}
