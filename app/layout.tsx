import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/LangContext'
import { SessionProvider } from '@/lib/SessionContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import Tracker from '@/components/Tracker'
import Navbar from '@/components/Navbar'
import { env } from '@/lib/env'
import { PRODUCT } from '@/lib/config'

const SITE_URL = env.siteUrl
const OG_IMAGE = `${SITE_URL}/opengraph-image`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PRODUCT.name} — ${PRODUCT.tagline}`,
    template: `%s — ${PRODUCT.name}`,
  },
  description:
    'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. ATS score, red flags, and actionable fixes — free.',
  keywords: [
    'AI resume feedback', 'ATS resume checker', 'resume review', 'resume score',
    'resume roaster', 'free resume checker', 'ATS optimization', 'resume tips',
    'job search', 'career advice',
  ],
  authors: [{ name: PRODUCT.name }],
  creator: PRODUCT.name,
  openGraph: {
    type: 'website',
    siteName: PRODUCT.name,
    title: `${PRODUCT.name} — ${PRODUCT.tagline}`,
    description:
      'Upload your PDF and get brutal, honest, AI-powered resume feedback in 12 seconds. ATS score, red flags, and actionable fixes — free.',
    url: SITE_URL,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${PRODUCT.name} — AI Resume Feedback` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PRODUCT.name} — ${PRODUCT.tagline}`,
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
    <html lang="en">
      <head>
        {/*
          Load all fonts via a single <link> so the build never needs to reach
          fonts.gstatic.com. next/font/google fetches at build time and fails
          in environments where Google Fonts is blocked/throttled. Vazirmatn
          (Persian) is loaded here too, not injected dynamically on language
          switch — it's available immediately, so FA text never has a moment
          where it falls back to a Latin-only family while the font loads.

          Plus Jakarta Sans is the one app-wide Latin family (--font-display
          and --font-body in app/globals.css both point at it) — to swap it
          for DM Sans, Manrope, or Outfit, change the family name in BOTH
          this href and those two globals.css lines; all four have a
          comparable weight range (400–800) so this same weight list works
          unchanged. Space Mono stays (still used for mono/eyebrow text).
          Hanken Grotesk stays too, but ONLY for the few allowlisted fixed-
          font exceptions (the resume preview panes, the canvas-drawn share
          image — see scripts/test-noHardcodedFonts.ts) — it is NOT a
          --font-* token and nothing else should reference it.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/*
          FOUC prevention: data-color-theme is normally set by
          lib/ThemeContext.tsx's effect, which only runs after React
          hydrates. :root already matches the default ("light") theme, so a
          first-time visitor sees zero flash — but a returning visitor with
          a stored "dark" preference would otherwise flash light-then-dark
          for one frame. This tiny blocking script runs before first paint
          and applies the stored preference synchronously, so there's never
          a flash either way. Inline only (CSP already allows
          script-src 'unsafe-inline'; no external request, nothing to fail).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('rr-theme');if(t==='dark')document.documentElement.setAttribute('data-color-theme','dark')}catch(e){}`,
          }}
        />
      </head>
      <body>
        {/* Atmosphere — fixed full-screen glow using the --glow/--tint tokens */}
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
