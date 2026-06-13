'use client'

import { useState, useEffect } from 'react'
import { useLang } from '@/lib/LangContext'

function useCountUp(target: number, run: boolean, dur = 1200) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf: number
    let start: number | null = null
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setV(Math.round(target * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, dur])
  return v
}

interface ScoreRingProps {
  score: number
  run?: boolean
  size?: number
  label?: string
  grade?: string
}

export default function ScoreRing({ score, run = true, size = 180, label, grade }: ScoreRingProps) {
  const { t } = useLang()
  const v    = useCountUp(score, run, 1300)
  const r    = (size - 22) / 2
  const c    = 2 * Math.PI * r
  const off  = c * (1 - v / 100)
  const band = score >= 75 ? t.hireReady : score >= 60 ? t.gettingThere : t.needsWork
  const displayLabel = label ?? t.atsScore
  const gid  = `g-${size}`

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--surface-3)" strokeWidth="11" fill="none" />
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={`url(#${gid})`} strokeWidth="11" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{
            transition: 'stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)',
            filter: 'drop-shadow(0 0 10px var(--glow))',
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: size * 0.30, lineHeight: 1, letterSpacing: '-0.04em',
        }}>
          {v}
          {grade && <span style={{ fontSize: size * 0.13, color: 'var(--accent)', marginLeft: 4 }}>{grade}</span>}
        </div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-mute)', marginTop: 6 }}>
          {displayLabel}
        </div>
        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>{band}</div>
      </div>
    </div>
  )
}
