import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/LangContext'
import { SessionProvider } from '@/lib/SessionContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import Tracker from '@/components/Tracker'
import Navbar from '@/components/Navbar'

const SITE_URL = 'https://resume-roaster.vercel.app'
const OG_IMAGE = `${SITE_URL}/opengraph-image`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Resume Roaster — AI Resume Feedback in 12 Seconds',
    template: '%s — Resume Roaster',
  },
  description:
    'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. ATS score, red flags, and actionable fixes — free.',
  keywords: [
    'AI resume feedback', 'ATS resume checker', 'resume review', 'resume score',
    'resume roaster', 'free resume checker', 'ATS optimization', 'resume tips',
    'job search', 'career advice',
  ],
  authors: [{ name: 'Resume Roaster' }],
  creator: 'Resume Roaster',
  openGraph: {
    type: 'website',
    siteName: 'Resume Roaster',
    title: 'Resume Roaster — AI Resume Feedback in 12 Seconds',
    description:
      'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. ATS score, red flags, and actionable fixes — free.',
    url: SITE_URL,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Resume Roaster — AI Resume Feedback' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resume Roaster — AI Resume Feedback in 12 Seconds',
    description:
      'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. Free.',
    images: [OG_IMAGE],
    creator: '@resumeroaster',
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="roast">
      <head>
        {/*
          Load all fonts via a single <link> so the build never needs to reach
          fonts.gstatic.com. next/font/google fetches at build time and fails
          in environments where Google Fonts is blocked/throttled.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Syne:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Atmosphere — fixed full-screen glow that reacts to data-theme CSS vars */}
        <div
          id="atmosphere"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(1200px 700px at 80% -10%, var(--glow), transparent 60%),' +
              'radial-gradient(900px 600px at 10% 110%, var(--tint), transparent 70%)',
            transition: 'background .7s cubic-bezier(.4,0,.2,1)',
          }}
        />

        <SessionProvider>
          <LangProvider>
            <ThemeProvider>
              <Tracker />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Navbar />
                {children}
              </div>
            </ThemeProvider>
          </LangProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
