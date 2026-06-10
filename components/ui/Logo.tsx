'use client'

interface LogoProps {
  size?: number
  onClick?: () => void
}

export default function Logo({ size = 30, onClick }: LogoProps) {
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
          display: 'grid', placeItems: 'center',
          background: 'linear-gradient(150deg, var(--accent), var(--accent-2))',
          boxShadow: '0 6px 18px var(--glow), inset 0 1px 0 rgba(255,255,255,.4)',
          fontSize: size * 0.52,
          transition: 'background .6s',
        }}
      >
        🔥
      </div>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: size * 0.6, letterSpacing: '-0.03em',
      }}>
        Resume<span style={{ color: 'var(--ink-mute)' }}> Roaster</span>
      </span>
    </div>
  )
}
