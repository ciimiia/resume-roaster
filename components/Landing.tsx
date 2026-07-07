'use client'

import { useState, useEffect } from 'react'
import { MODES, MODE_ORDER, RESULTS } from '@/lib/data'
import type { ModeId } from '@/lib/types'
import { useLang } from '@/lib/LangContext'
import { useSiteContent } from '@/lib/SiteContentContext'
import Button from './ui/Button'
import Icon from './ui/Icon'
import Logo from './ui/Logo'
import Pill from './ui/Pill'
import ScoreRing from './ui/ScoreRing'

export const cardStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--shadow-1)',
  ...extra,
})


/* ---- StatTicker ---- */
function StatTicker() {
  const { t } = useLang()
  const [n, setN] = useState(10428)
  useEffect(() => {
    const id = setInterval(() => setN(v => v + Math.floor(Math.random() * 3)), 2600)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'flex' }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{
              width: 30, height: 30, borderRadius: '50%', marginLeft: i ? -10 : 0,
              border: '2px solid var(--bg)', display: 'grid', placeItems: 'center', fontSize: 14,
              background: ['#2a2a35','#33333f','#3c2a2a','#2a3530'][i],
            }}>
              {['🧑‍💻','👩‍🎨','🧑‍💼','🌎'][i]}
            </span>
          ))}
        </span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, lineHeight: 1 }}>
            {n.toLocaleString()}+
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '.06em' }}>
            {t.statLabel}
          </div>
        </div>
      </div>
      <div style={{ width: 1, height: 32, background: 'var(--line-2)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: 'var(--accent)', display: 'flex', gap: 2 }}>
          {[0,1,2,3,4].map(i => <Icon key={i} name="star" size={15} />)}
        </span>
        <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{t.statRating}</span>
      </div>
    </div>
  )
}

/* ---- ModeSelectorCard (exported for Workspace reuse) ---- */
export function ModeSelectorCard({
  mode, active, onPick, compact,
}: {
  mode: typeof MODES[ModeId]
  active: boolean
  onPick: () => void
  compact?: boolean
}) {
  const { t } = useLang()
  const tm = t.modes[mode.id]
  const [hover, setHover] = useState(false)
  const on = active || hover
  return (
    <button
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left', cursor: 'pointer', position: 'relative', overflow: 'hidden',
        padding: compact ? '18px' : '22px', borderRadius: 'var(--r-md)',
        background: active ? `color-mix(in srgb, ${mode.accent} 13%, var(--surface))` : 'var(--surface)',
        border: `1.5px solid ${active ? mode.accent : 'var(--line)'}`,
        boxShadow: active ? `0 14px 40px color-mix(in srgb, ${mode.accent} 22%, transparent)` : 'var(--shadow-1)',
        transform: on ? 'translateY(-3px)' : 'none',
        transition: 'all .25s cubic-bezier(.34,1.4,.64,1)', flex: 1, minWidth: 0,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, opacity: on ? 1 : 0, transition: 'opacity .3s',
        background: `radial-gradient(120px 80px at 85% 0%, color-mix(in srgb, ${mode.accent} 22%, transparent), transparent 70%)`,
      }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: compact ? 28 : 34, filter: on ? 'none' : 'grayscale(.4)', transition: 'filter .3s' }}>
          {mode.glyph}
        </span>
        <span style={{
          width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: `1.5px solid ${active ? mode.accent : 'var(--line-2)'}`,
          background: active ? mode.accent : 'transparent',
          color: 'var(--accent-ink)', transition: 'all .2s',
        }}>
          {active && <Icon name="check" size={14} stroke={2.4} />}
        </span>
      </div>
      <div style={{ position: 'relative', marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: compact ? 18 : 21 }}>
          {tm.name}
        </div>
        <div className="mono" style={{ fontSize: 11.5, letterSpacing: '.04em', color: mode.accent, marginTop: 4 }}>
          {tm.tagline}
        </div>
        {!compact && (
          <p style={{ fontSize: 14.5, color: 'var(--ink-mute)', marginTop: 10, lineHeight: 1.5 }}>
            {tm.blurb}
          </p>
        )}
      </div>
    </button>
  )
}

/* ---- Landing page ---- */
interface LandingProps {
  mode: ModeId
  setMode: (m: ModeId) => void
  onStart: () => void
}

export default function Landing({ mode, setMode, onStart }: LandingProps) {
  const { t, lang } = useLang()
  const sc = useSiteContent()
  const m = MODES[mode]
  const tm = t.modes[mode]

  // Helper: use KV override if present, else fall back to i18n
  const s = (field: keyof typeof sc, fallback: string) =>
    sc[field]?.[lang as 'en' | 'fa'] || fallback

  return (
    <div style={{ animation: 'fadeIn .5s both' }}>
      {/* HERO */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(40px,7vw,84px) clamp(20px,5vw,60px) 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,0.95fr)', gap: 'clamp(28px,4vw,64px)', alignItems: 'center' }} className="hero-grid">

          {/* Left */}
          <div style={{ animation: 'fadeUp .6s both' }}>
            <Pill tone="accent" style={{ marginBottom: 22 }}>
              <Icon name="spark" size={13} /> {t.heroPill}
            </Pill>
            <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 700, lineHeight: 0.98 }}>
              {s('heroH1a', t.heroH1a)}<br />{s('heroH1b', t.heroH1b)}<br />
              <span style={{ background: 'linear-gradient(120deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {s('heroH1c', t.heroH1c)}
              </span>
            </h1>
            <p style={{ fontSize: 'clamp(17px,2vw,20px)', color: 'var(--ink-soft)', maxWidth: 520, marginTop: 22, lineHeight: 1.55 }}>
              {s('heroBody', t.heroBody)}
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 30, flexWrap: 'wrap' }}>
              <Button size="lg" icon="upload" onClick={onStart}>{s('heroCta1', t.heroCta1)}</Button>
              <Button size="lg" variant="ghost" iconRight="arrow" onClick={onStart}>{s('heroCta2', t.heroCta2)} {m.glyph}</Button>
            </div>
            <div style={{ marginTop: 34 }}><StatTicker /></div>
          </div>

          {/* Right — live preview */}
          <div style={{ animation: 'fadeUp .7s .1s both' }}>
            <div style={cardStyle({ padding: 24, position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, var(--glow), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <span className="eyebrow">{t.livePreview} {tm.name}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {['#ff5f57','#febc2e','#28c840'].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                <ScoreRing key={mode} score={RESULTS[mode].score} size={132} grade={RESULTS[mode].grade} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 26 }}>{m.glyph}</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, lineHeight: 1.2, marginTop: 8 }}>
                    &quot;{RESULTS[mode].verdict}&quot;
                  </p>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginTop: 10 }}>
                    {RESULTS[mode].sections.length} {t.sectionsAnalyzed} · {RESULTS[mode].fixes.length} {t.fixes}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selector */}
            <div id="modes" style={{ marginTop: 14, scrollMarginTop: 80 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>{t.pickMode}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {MODE_ORDER.map(id => (
                  <ModeSelectorCard key={id} compact mode={MODES[id]} active={mode === id} onPick={() => setMode(id)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ maxWidth: 1240, margin: '0 auto', padding: '40px clamp(20px,5vw,60px) 90px', scrollMarginTop: 80 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <h2 style={{ fontSize: 'clamp(26px,3vw,38px)' }}>{t.howH2}</h2>
          <span className="eyebrow">{t.howEyebrow}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="steps-grid">
          {t.steps.map(s => (
            <div key={s.n} style={cardStyle({ padding: 26 })}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--accent)', letterSpacing: '.1em' }}>{s.n}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 21, marginTop: 14 }}>{s.t}</div>
              <p style={{ fontSize: 15, color: 'var(--ink-mute)', marginTop: 10, lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>

        {/* CTA band */}
        <div style={cardStyle({ marginTop: 48, padding: 'clamp(28px,4vw,52px)', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(140deg, var(--surface-2), var(--surface))' })}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px 200px at 50% 0%, var(--glow), transparent 70%)', pointerEvents: 'none' }} />
          <h2 style={{ position: 'relative', fontSize: 'clamp(28px,4vw,46px)', maxWidth: 720, margin: '0 auto' }}>
            {s('ctaH2', t.ctaH2)}
          </h2>
          <p style={{ position: 'relative', color: 'var(--ink-soft)', fontSize: 18, marginTop: 14 }}>
            {s('ctaBody', t.ctaBody)}
          </p>
          <div style={{ position: 'relative', marginTop: 26, display: 'flex', justifyContent: 'center' }}>
            <Button size="lg" icon="upload" onClick={onStart}>{t.ctaBtn}</Button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '26px clamp(20px,5vw,60px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <Logo size={24} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          {s('footerTagline', t.footer)}
        </span>
      </footer>
    </div>
  )
}
