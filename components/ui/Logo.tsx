'use client'

import { PRODUCT } from '@/lib/config'

interface LogoProps {
  size?: number
  onClick?: () => void
}

// Hand-built SVG recreation of the provided reference mark (a winding
// "road" stroke — "michi" means road/path in Japanese — with a dot above
// it), not the reference image itself. The road stroke uses var(--ink) so
// it stays legible in both themes automatically; the dot and "ai" use a
// fixed brand orange, same reasoning lib/data.ts's MODES colors use for
// staying fixed regardless of theme — it's an identity color, not UI chrome.
const BRAND_ORANGE = '#E2542A'

export default function Logo({ size = 30, onClick }: LogoProps) {
  const [first, ...rest] = PRODUCT.name.split(' ')
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: size * 0.3,
        cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <path
          d="M40,103 C16,103 16,76 34,69 C53,62 57,47 41,41 C28,36 21,29 23,19"
          stroke="var(--ink)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="26" cy="15" r="13" fill={BRAND_ORANGE} />
      </svg>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: size * 0.62, letterSpacing: 'var(--tracking-tight)', color: 'var(--ink)',
      }}>
        {first}
        {rest.length > 0 && <span style={{ color: BRAND_ORANGE, fontWeight: 600 }}> {rest.join(' ').toLowerCase()}</span>}
      </span>
    </div>
  )
}
