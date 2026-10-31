import { notFound } from 'next/navigation'
import { getResult } from '@/lib/db/results'
import type { Metadata } from 'next'
import SharedResult from '@/components/SharedResult'
import { MODES } from '@/lib/data'
import { PRODUCT } from '@/lib/config'

async function load(id: string) {
  try {
    return await getResult(id)
  } catch (err) {
    console.error('[r/[id]] failed to load result:', err)
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const saved = await load(params.id)
  if (!saved) return { title: PRODUCT.name }

  const { result, mode } = saved
  const m = MODES[mode]
  const title = `"${result.verdict}" — ${PRODUCT.name}`
  const description = `${m.glyph} ${m.name} · Score: ${result.score}/100 (${result.grade}) — ${result.summary.slice(0, 140)}…`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: PRODUCT.name,
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
