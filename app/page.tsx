import type { Metadata } from 'next'
import App from '@/components/App'
import { getSiteContentSafe } from '@/lib/db/siteSettings'
import { SiteContentProvider } from '@/lib/SiteContentContext'
import { env } from '@/lib/env'
import { PRODUCT } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${PRODUCT.name} — ${PRODUCT.tagline}`,
  description:
    'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. ATS score, red flags, and actionable fixes — free.',
  keywords: [
    'AI resume feedback', 'resume checker', 'ATS resume score', 'resume roaster',
    'free resume review', 'resume feedback tool', 'resume AI',
  ],
  alternates: { canonical: env.siteUrl },
  openGraph: {
    title: `${PRODUCT.name} — ${PRODUCT.tagline}`,
    description: 'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. Free.',
    url: env.siteUrl,
    type: 'website',
  },
}

export default async function Home() {
  const siteContent = await getSiteContentSafe()
  return (
    <SiteContentProvider content={siteContent}>
      <App />
    </SiteContentProvider>
  )
}
