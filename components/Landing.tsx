'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MODES, MODE_ORDER, RESULTS } from '@/lib/data'
import type { ModeId } from '@/lib/types'
import { useLang } from '@/lib/LangContext'
import { useSiteContent } from '@/lib/SiteContentContext'
import { cardStyle } from '@/lib/styles'
import Button from './ui/Button'
import Icon from './ui/Icon'
import Logo from './ui/Logo'
import Pill from './ui/Pill'
import ScoreRing from './ui/ScoreRing'


/* ---- StatTicker ----
 * `n` comes from the server (app/page.tsx fetches it at request time and
 * passes it down through App -> Landing) rather than a client-side fetch —
 * no extra round-trip, and it reflects a real count, not a placeholder that
 * increments on its own. Hidden entirely below 100, per product decision:
 * a true-but-small number reads worse than showing nothing. */
function StatTicker({ n }: { n: number }) {
  const { t } = useLang()
  if (n < 100) return null
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
        transition: 'all .25s var(--ease-spring)', flex: 1, minWidth: 0,
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
  roastedCount: number
}

export default function Landing({ mode, setMode, onStart, roastedCount }: LandingProps) {
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
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(40px,7vw,84px) var(--gutter) var(--sp-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,0.95fr)', gap: 'clamp(28px,4vw,64px)', alignItems: 'center' }} className="hero-grid">

          {/* Left */}
          <div style={{ animation: 'fadeUp .6s both' }}>
            <Pill tone="accent" style={{ marginBottom: 'var(--sp-5)' }}>
              <Icon name="spark" size={13} /> {t.heroPill}
            </Pill>
            <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, lineHeight: 0.98 }}>
              {s('heroH1a', t.heroH1a)}<br />{s('heroH1b', t.heroH1b)}<br />
              <span style={{ background: 'linear-gradient(120deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {s('heroH1c', t.heroH1c)}
              </span>
            </h1>
            <p style={{ fontSize: 'var(--fs-md)', color: 'var(--ink-soft)', maxWidth: 520, marginTop: 'var(--sp-5)', lineHeight: 1.55 }}>
              {s('heroBody', t.heroBody)}
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-7)', flexWrap: 'wrap' }}>
              <Button size="lg" icon="upload" onClick={onStart}>{s('heroCta1', t.heroCta1)}</Button>
              <Button size="lg" variant="ghost" iconRight="arrow" onClick={onStart}>{s('heroCta2', t.heroCta2)} {m.glyph}</Button>
            </div>
            <div style={{ marginTop: 'var(--sp-8)' }}><StatTicker n={roastedCount} /></div>
          </div>

          {/* Right — live preview */}
          <div style={{ animation: 'fadeUp .7s .1s both' }}>
            <div style={cardStyle({ padding: 'var(--sp-6)', position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, var(--glow), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <span className="eyebrow">{t.livePreview} {tm.name}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {['#ff5f57','#febc2e','#28c840'].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'center' }}>
                <ScoreRing key={mode} score={RESULTS[mode].score} size={168} grade={RESULTS[mode].grade} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 26 }}>{m.glyph}</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, lineHeight: 1.3, marginTop: 'var(--sp-2)' }}>
                    &quot;{RESULTS[mode].verdict}&quot;
                  </p>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginTop: 'var(--sp-2)' }}>
                    {RESULTS[mode].sections.length} {t.sectionsAnalyzed} · {RESULTS[mode].fixes.length} {t.fixes}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selector */}
            <div id="modes" style={{ marginTop: 'var(--sp-4)', scrollMarginTop: 80 }}>
              <div className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>{t.pickMode}</div>
              <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                {MODE_ORDER.map(id => (
                  <ModeSelectorCard key={id} compact mode={MODES[id]} active={mode === id} onPick={() => setMode(id)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ maxWidth: 1240, margin: '0 auto', padding: 'var(--sp-7) var(--gutter) var(--sp-11)', scrollMarginTop: 80 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)', marginBottom: 'var(--sp-7)' }}>
          <h2 style={{ fontSize: 'var(--fs-2xl)' }}>{t.howH2}</h2>
          <span className="eyebrow">{t.howEyebrow}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)' }} className="steps-grid">
          {t.steps.map(s => (
            <div key={s.n} style={cardStyle({ padding: 'var(--sp-6)', transition: 'transform .25s var(--ease-spring), border-color .25s' })}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--line)' }}
            >
              <div className="mono" style={{
                width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center',
                fontSize: 13, color: 'var(--accent)', letterSpacing: '.02em',
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}>{s.n}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', marginTop: 'var(--sp-4)' }}>{s.t}</div>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-mute)', marginTop: 'var(--sp-2)', lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>

        {/* CTA band */}
        <div style={cardStyle({ marginTop: 'var(--sp-9)', padding: 'clamp(28px,4vw,52px)', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(140deg, var(--surface-2), var(--surface))' })}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px 200px at 50% 0%, var(--glow), transparent 70%)', pointerEvents: 'none' }} />
          <h2 style={{ position: 'relative', fontSize: 'var(--fs-2xl)', maxWidth: 720, margin: '0 auto' }}>
            {s('ctaH2', t.ctaH2)}
          </h2>
          <p style={{ position: 'relative', color: 'var(--ink-soft)', fontSize: 'var(--fs-md)', marginTop: 'var(--sp-3)' }}>
            {s('ctaBody', t.ctaBody)}
          </p>
          <div style={{ position: 'relative', marginTop: 'var(--sp-6)', display: 'flex', justifyContent: 'center' }}>
            <Button size="lg" icon="upload" onClick={onStart}>{t.ctaBtn}</Button>
          </div>
        </div>
      </section>

      <footer style={{
        borderTop: '1px solid var(--line)', padding: 'var(--sp-6) var(--gutter)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)',
      }}>
        <Logo size={24} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
          {[
            { label: t.navBlog, href: '/blog' },
            { label: t.navBuilder, href: '/builder' },
            { label: t.clTitle, href: '/cover-letter' },
          ].map(l => (
            <Link key={l.href} href={l.href} style={footerLinkStyle}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-mute)')}
            >{l.label}</Link>
          ))}
        </div>
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          {s('footerTagline', t.footer)}
        </span>
      </footer>
    </div>
  )
}

const footerLinkStyle: React.CSSProperties = {
  fontSize: 13.5, color: 'var(--ink-mute)', transition: 'color .2s var(--ease-out)',
}
