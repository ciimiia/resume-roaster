import type { Metadata } from 'next'
import CoverLetterClient from './CoverLetterClient'
import { safeGet } from '@/lib/kv'
import { SiteContentProvider } from '@/lib/SiteContentContext'
import type { SiteContent } from '@/lib/SiteContentContext'
import { env } from '@/lib/env'
import { PRODUCT } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Cover Letter Generator',
  description:
    'Generate a tailored, professional cover letter in seconds. Paste your resume and job description — our AI writes a compelling letter matched to the role.',
  keywords: [
    'AI cover letter generator', 'cover letter writer', 'cover letter AI',
    'free cover letter generator', 'job application letter', 'tailored cover letter',
  ],
  alternates: { canonical: `${env.siteUrl}/cover-letter` },
  openGraph: {
    title: `AI Cover Letter Generator — ${PRODUCT.name}`,
    description: 'Generate a tailored cover letter in seconds. Paste your resume + job description and get a compelling letter matched to the role.',
    url: `${env.siteUrl}/cover-letter`,
    type: 'website',
  },
}

export default async function CoverLetterPage() {
  const siteContent = await safeGet<SiteContent>('site:content', {})
  return (
    <SiteContentProvider content={siteContent}>
      <CoverLetterClient />
    </SiteContentProvider>
  )
}
