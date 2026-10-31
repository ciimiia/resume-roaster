import type { Metadata } from 'next'
import BuilderApp from '@/components/builder/BuilderApp'
import { getSiteContentSafe } from '@/lib/db/siteSettings'
import { SiteContentProvider } from '@/lib/SiteContentContext'
import { env } from '@/lib/env'
import { PRODUCT } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Free Resume Builder',
  description:
    'Build a clean, ATS-ready resume in minutes. Fill in your details, preview in real time, and export as PDF — no account required.',
  keywords: [
    'free resume builder', 'ATS resume builder', 'resume maker', 'resume template',
    'CV builder', 'resume creator online', 'PDF resume builder',
  ],
  alternates: { canonical: `${env.siteUrl}/builder` },
  openGraph: {
    title: `Free Resume Builder — ${PRODUCT.name}`,
    description: 'Build a clean, ATS-ready resume in minutes and export as PDF — free.',
    url: `${env.siteUrl}/builder`,
    type: 'website',
  },
}

export default async function BuilderPage() {
  const siteContent = await getSiteContentSafe()
  return (
    <SiteContentProvider content={siteContent}>
      <BuilderApp />
    </SiteContentProvider>
  )
}
