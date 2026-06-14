import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resume Tips & Career Advice',
  description:
    'ATS optimization, developer resume mistakes, remote job strategies, and career advice that actually works. Free guides from Resume Roaster.',
  keywords: ['resume tips', 'ATS checker', 'career advice', 'job search tips', 'remote job resume', 'developer resume'],
  openGraph: {
    title: 'Resume Tips & Career Advice — Resume Roaster Blog',
    description: 'ATS optimization, developer resume mistakes, remote job strategies, and career advice that actually works.',
    type: 'website',
  },
  alternates: { canonical: 'https://resume-roaster.vercel.app/blog' },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
