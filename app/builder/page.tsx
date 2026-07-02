import type { Metadata } from 'next'
import BuilderApp from '@/components/builder/BuilderApp'
import { kv } from '@/lib/kv'
import { SiteContentProvider } from '@/lib/SiteContentContext'
import type { SiteContent } from '@/lib/SiteContentContext'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Free Resume Builder',
  description:
    'Build a clean, ATS-ready resume in minutes. Fill in your details, preview in real time, and export as PDF — no account required.',
  keywords: [
    'free resume builder', 'ATS resume builder', 'resume maker', 'resume template',
    'CV builder', 'resume creator online', 'PDF resume builder',
  ],
  alternates: { canonical: 'https://resume-roaster.vercel.app/builder' },
  openGraph: {
    title: 'Free Resume Builder — Resume Roaster',
    description: 'Build a clean, ATS-ready resume in minutes and export as PDF — free.',
    url: 'https://resume-roaster.vercel.app/builder',
    type: 'website',
  },
}

export default async function BuilderPage() {
  const siteContent = (await kv.get<SiteContent>('site:content')) ?? {}
  return (
    <SiteContentProvider content={siteContent}>
      <BuilderApp />
    </SiteContentProvider>
  )
}
