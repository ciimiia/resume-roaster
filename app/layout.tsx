import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono, Hanken_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})
const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Resume Roaster — AI Resume Feedback',
  description:
    'Upload your PDF and get brutal, honest, constructive AI feedback on your resume in 12 seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${spaceMono.variable} ${hankenGrotesk.variable}`}>
        {/* Wire up font CSS vars so the rest of the app can use var(--font-display) etc. */}
        <style>{`
          :root {
            --font-display: var(--font-space-grotesk), system-ui, sans-serif;
            --font-body:    var(--font-hanken-grotesk), system-ui, sans-serif;
            --font-mono:    var(--font-space-mono), ui-monospace, monospace;
          }
        `}</style>

        {/* Atmosphere — fixed full-screen glow; reacts to data-theme via CSS vars */}
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

        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </body>
    </html>
  )
}
