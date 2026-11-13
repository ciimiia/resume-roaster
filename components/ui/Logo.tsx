'use client'

import { PRODUCT } from '@/lib/config'

interface LogoProps {
  size?: number
  onClick?: () => void
}

// The mark is a plain placeholder box until a real logo asset replaces it —
// no emoji, since the previous 🔥 was a literal pun on the old name
// ("Roaster") that doesn't carry over.
export default function Logo({ size = 30, onClick }: LogoProps) {
  const [first, ...rest] = PRODUCT.name.split(' ')
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
      }}
    >
      <div
        style={{
          width: size, height: size, borderRadius: 9,
          background: 'linear-gradient(150deg, var(--accent), var(--accent-2))',
          boxShadow: '0 6px 18px var(--glow), inset 0 1px 0 rgba(255,255,255,.4)',
          transition: 'background .6s',
        }}
      />
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: size * 0.6, letterSpacing: '-0.03em',
      }}>
        {first}{rest.length > 0 && <span style={{ color: 'var(--ink-mute)' }}> {rest.join(' ')}</span>}
      </span>
    </div>
  )
}
