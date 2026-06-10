'use client'

import type { ReactNode } from 'react'

interface PillProps {
  children: ReactNode
  tone?: 'mute' | 'accent' | 'good'
  style?: React.CSSProperties
}

export default function Pill({ children, tone = 'mute', style }: PillProps) {
  const tones = {
    mute:   { color: 'var(--ink-mute)',  border: 'var(--line)',                                           bg: 'var(--surface)' },
    accent: { color: 'var(--accent)',    border: 'color-mix(in srgb, var(--accent) 35%, transparent)',   bg: 'color-mix(in srgb, var(--accent) 12%, transparent)' },
    good:   { color: 'var(--intl)',      border: 'rgba(77,204,136,.3)',                                   bg: 'rgba(77,204,136,.1)' },
  }[tone]

  return (
    <span className="mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '6px 12px', borderRadius: 99,
      color: tones.color, border: `1px solid ${tones.border}`, background: tones.bg,
      ...style,
    }}>
      {children}
    </span>
  )
}
