import type { Metadata } from 'next'
import { env } from '@/lib/env'
import { PRODUCT } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Resume Tips & Career Advice',
  description:
    `ATS optimization, developer resume mistakes, remote job strategies, and career advice that actually works. Free guides from ${PRODUCT.name}.`,
  keywords: ['resume tips', 'ATS checker', 'career advice', 'job search tips', 'remote job resume', 'developer resume'],
  openGraph: {
    title: `Resume Tips & Career Advice — ${PRODUCT.name} Blog`,
    description: 'ATS optimization, developer resume mistakes, remote job strategies, and career advice that actually works.',
    type: 'website',
  },
  alternates: { canonical: `${env.siteUrl}/blog` },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
