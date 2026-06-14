import type { Metadata } from 'next'
import BuilderApp from '@/components/builder/BuilderApp'

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

export default function BuilderPage() {
  return <BuilderApp />
}
