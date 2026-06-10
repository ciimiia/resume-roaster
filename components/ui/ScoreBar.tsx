'use client'

import { useState, useEffect } from 'react'

interface ScoreBarProps {
  score: number
  run?: boolean
  delay?: number
}

export default function ScoreBar({ score, run = true, delay = 0 }: ScoreBarProps) {
  const [w, setW] = useState(0)

  useEffect(() => {
    if (!run) return
    const t = setTimeout(() => setW(score), 60 + delay)
    return () => clearTimeout(t)
  }, [score, run, delay])

  const col = score >= 75 ? 'var(--intl)' : score >= 55 ? 'var(--accent)' : 'var(--roast)'

  return (
    <div style={{ height: 7, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden', width: '100%' }}>
      <div style={{
        height: '100%', width: `${w}%`, borderRadius: 99,
        background: `linear-gradient(90deg, ${col}, color-mix(in srgb, ${col} 60%, white))`,
        transition: 'width 1.1s cubic-bezier(.16,1,.3,1)',
      }} />
    </div>
  )
}
