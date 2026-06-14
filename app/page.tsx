import type { Metadata } from 'next'
import App from '@/components/App'

export const metadata: Metadata = {
  title: 'Resume Roaster — AI Resume Feedback in 12 Seconds',
  description:
    'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. ATS score, red flags, and actionable fixes — free.',
  keywords: [
    'AI resume feedback', 'resume checker', 'ATS resume score', 'resume roaster',
    'free resume review', 'resume feedback tool', 'resume AI',
  ],
  alternates: { canonical: 'https://resume-roaster.vercel.app' },
  openGraph: {
    title: 'Resume Roaster — AI Resume Feedback in 12 Seconds',
    description: 'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. Free.',
    url: 'https://resume-roaster.vercel.app',
    type: 'website',
  },
}

export default function Home() {
  return <App />
}
