import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/LangContext'
import { SessionProvider } from '@/lib/SessionContext'

export const metadata: Metadata = {
  title: 'Resume Roaster — AI Resume Feedback',
  description:
    'Upload your PDF and get brutal, honest, constructive AI feedback on your resume in 12 seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
            <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
          </LangProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
