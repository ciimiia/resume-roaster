import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Resume Roaster — AI Resume Feedback in 12 Seconds'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '64px 80px',
          background: '#0E0809',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Glow layers */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 800px 500px at 80% -10%, rgba(255,77,77,0.22), transparent 65%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 600px 400px at 5% 110%, rgba(255,77,77,0.09), transparent 70%)',
          display: 'flex',
        }} />

        {/* Score card — right side */}
        <div style={{
          position: 'absolute', right: 80, top: 90,
          width: 320, height: 380,
          background: 'rgba(23,16,15,0.95)',
          border: '1.5px solid rgba(255,77,77,0.22)',
          borderRadius: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}>
          {/* Score number */}
          <div style={{
            fontSize: 80, fontWeight: 900, color: '#F5F5F7', lineHeight: 1,
            display: 'flex',
          }}>78</div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#FF4D4D',
            letterSpacing: '0.15em', display: 'flex',
          }}>ATS SCORE</div>
          {/* Grade */}
          <div style={{
            marginTop: 8,
            padding: '8px 24px',
            background: 'rgba(255,77,77,0.15)',
            border: '1.5px solid rgba(255,77,77,0.4)',
            borderRadius: 10,
            fontSize: 26, fontWeight: 900, color: '#FF4D4D',
            display: 'flex',
          }}>B+</div>
        </div>

        {/* Left content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 640 }}>
          {/* Flame + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 56, display: 'flex' }}>🔥</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#F5F5F7', letterSpacing: '-1px', display: 'flex' }}>
              Resume Roaster
            </div>
          </div>

          {/* Accent line */}
          <div style={{
            width: 420, height: 4, borderRadius: 2,
            background: 'linear-gradient(90deg, #FF4D4D, #FF8A3D)',
            marginBottom: 28, display: 'flex',
          }} />

          {/* Tagline */}
          <div style={{
            fontSize: 26, color: '#84848F', fontWeight: 400, lineHeight: 1.4,
            marginBottom: 40, display: 'flex',
          }}>
            AI resume feedback · in 12 seconds · free
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'ATS SCORE', color: '#FF4D4D', bg: 'rgba(255,77,77,0.12)', border: 'rgba(255,77,77,0.35)' },
              { label: 'RED FLAGS', color: '#4D9FFF', bg: 'rgba(77,159,255,0.12)', border: 'rgba(77,159,255,0.35)' },
              { label: 'FIXES', color: '#4DCC88', bg: 'rgba(77,204,136,0.12)', border: 'rgba(77,204,136,0.35)' },
            ].map(p => (
              <div key={p.label} style={{
                padding: '10px 20px',
                background: p.bg,
                border: `1.5px solid ${p.border}`,
                borderRadius: 999,
                fontSize: 13, fontWeight: 700, color: p.color,
                letterSpacing: '0.08em', display: 'flex',
              }}>{p.label}</div>
            ))}
          </div>
        </div>

        {/* URL watermark */}
        <div style={{
          position: 'absolute', bottom: 24, right: 32,
          fontSize: 13, color: 'rgba(255,255,255,0.15)',
          display: 'flex',
        }}>
          resume-roaster.vercel.app
        </div>
      </div>
    ),
    { ...size },
  )
}
