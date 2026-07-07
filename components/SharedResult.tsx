'use client'

import Link from 'next/link'
import { MODES } from '@/lib/data'
import type { ModeId, AnalysisResult } from '@/lib/types'
import Logo from './ui/Logo'
import Pill from './ui/Pill'
import ScoreBar from './ui/ScoreBar'
import ScoreRing from './ui/ScoreRing'
import Icon from './ui/Icon'
import { cardStyle } from './Landing'
import { useLang } from '@/lib/LangContext'

function SectionRow({ s, i }: { s: AnalysisResult['sections'][0]; i: number }) {
  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid var(--line)', animation: `fadeUp .5s ${0.1 + i * 0.07}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>{s.label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: s.score >= 75 ? 'var(--intl)' : s.score >= 55 ? 'var(--accent)' : 'var(--roast)' }}>
          {s.score}<span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>/100</span>
        </span>
      </div>
      <ScoreBar score={s.score} run delay={i * 70} />
      <p style={{ fontSize: 14.5, color: 'var(--ink-mute)', marginTop: 11, lineHeight: 1.55 }}>{s.note}</p>
    </div>
  )
}

function ListBlock({ icon, title, items, tone }: { icon: string; title: string; items: string[]; tone: 'win' | 'fix' | 'flag' }) {
  const color = tone === 'win' ? 'var(--intl)' : tone === 'fix' ? 'var(--accent)' : 'var(--roast)'
  return (
    <div style={cardStyle({ padding: 24 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
          <Icon name={icon} size={17} />
        </span>
        <h3 style={{ fontSize: 18 }}>{title}</h3>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-faint)' }}>{items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, animation: `fadeUp .5s ${0.15 + i * 0.06}s both` }}>
            <span style={{ flexShrink: 0, marginTop: 6, width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{it}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SharedResult({ mode, result }: { mode: ModeId; result: AnalysisResult }) {
  const { t } = useLang()
  const m = MODES[mode]
  const scoreDesc = result.score >= 75 ? t.scoreHigh : result.score >= 60 ? t.scoreMid : t.scoreLow

  return (
    <div style={{ animation: 'fadeIn .4s both', minHeight: '100vh' }}>
      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px clamp(20px,5vw,60px)',
        background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
        backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo size={24} /></Link>
        <Pill tone="accent">{m.glyph} {t.modes[mode].name}</Pill>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 'var(--r-md)', textDecoration: 'none',
          background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
          color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
        }}>
          {t.sharedTryYourOwn}
        </Link>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(28px,4vw,52px) clamp(20px,5vw,60px) 90px' }}>
        {/* Shared-by banner */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 999, marginBottom: 28,
          background: 'color-mix(in srgb, var(--accent) 10%, var(--surface-2))',
          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)',
          animation: 'fadeUp .4s both',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0 }} />
          {t.sharedViaBadge}
        </div>

        <h1 style={{ fontSize: 'clamp(28px,4.5vw,54px)', maxWidth: 900, lineHeight: 1.1, animation: 'fadeUp .5s .05s both' }}>
          &quot;{result.verdict}&quot;
        </h1>
        <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: 'var(--ink-soft)', maxWidth: 780, marginTop: 20, lineHeight: 1.6, animation: 'fadeUp .5s .1s both' }}>
          {result.summary}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 22, marginTop: 40, alignItems: 'start' }} className="results-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={cardStyle({ padding: 26 })}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 style={{ fontSize: 19 }}>{t.theBreakdown}</h3>
                <span className="eyebrow">{result.sections.length} {t.sectionsSuffix}</span>
              </div>
              {result.sections.map((s, i) => <SectionRow key={s.label} s={s} i={i} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }} className="lists-grid">
              <ListBlock icon="star" title={t.whatsWorking} items={result.wins}  tone="win"  />
              <ListBlock icon="flag" title={t.redFlags}     items={result.flags} tone="flag" />
            </div>
            <ListBlock icon="bolt" title={t.fixTheseFirst} items={result.fixes} tone="fix" />
          </div>

          <div style={{ position: 'sticky', top: 90, display: 'flex', flexDirection: 'column', gap: 18 }} className="results-aside">
            {/* Score */}
            <div style={cardStyle({ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 240, height: 160, background: 'radial-gradient(circle, var(--glow), transparent 70%)', pointerEvents: 'none' }} />
              <span className="eyebrow" style={{ position: 'relative' }}>{t.overallAtsScore}</span>
              <div style={{ position: 'relative', margin: '18px 0 8px' }}>
                <ScoreRing score={result.score} size={200} grade={result.grade} />
              </div>
              <p style={{ position: 'relative', fontSize: 14.5, color: 'var(--ink-mute)', maxWidth: 240 }}>
                {scoreDesc}
              </p>
            </div>

            {/* CTA */}
            <div style={cardStyle({ padding: 28, textAlign: 'center' })}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>
                {t.sharedReadyTitle}
              </p>
              <p style={{ fontSize: 14, color: 'var(--ink-mute)', marginBottom: 22, lineHeight: 1.55 }}>
                {t.sharedReadyBody}
              </p>
              <Link href="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 24px', borderRadius: 'var(--r-md)', textDecoration: 'none',
                background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
                color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                transition: 'opacity .2s', width: '100%', justifyContent: 'center',
                boxSizing: 'border-box',
              }}>
                {t.blogCTABtn}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '26px clamp(20px,5vw,60px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <Logo size={24} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
          {t.footer}
        </span>
      </footer>
    </div>
  )
}
