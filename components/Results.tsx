'use client'

import { useState, useRef, useEffect } from 'react'
import { MODES, MODE_ORDER, RESULTS as CANNED } from '@/lib/data'
import type { ModeId, AnalysisResult } from '@/lib/types'
import { useLang } from '@/lib/LangContext'
import Button from './ui/Button'
import Icon from './ui/Icon'
import Logo from './ui/Logo'
import Pill from './ui/Pill'
import ScoreBar from './ui/ScoreBar'
import ScoreRing from './ui/ScoreRing'
import Typewriter from './ui/Typewriter'
import { cardStyle } from './Landing'

/* ---- Canvas share card helpers ---- */
const CARD_THEME = {
  roast: { bg1: '#1A0A0B', bg2: '#0C0506', a: '#FF4D4D', a2: '#FF8A3D' },
  coach: { bg1: '#0B1220', bg2: '#070A12', a: '#4D9FFF', a2: '#7C7CFF' },
  intl:  { bg1: '#08160F', bg2: '#050B08', a: '#4DCC88', a2: '#36D6C3' },
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ')
  let line = ''
  let yy = y
  for (const w of words) {
    const test = line + w + ' '
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, yy); line = w + ' '; yy += lh
    } else { line = test }
  }
  ctx.fillText(line.trim(), x, yy)
}

function drawShareCard(canvas: HTMLCanvasElement, mode: ModeId, r: AnalysisResult) {
  const W = 1080, H = 1080
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const t = CARD_THEME[mode]
  const M = MODES[mode]
  const PAD = 84

  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, t.bg1); g.addColorStop(1, t.bg2)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

  const rg = ctx.createRadialGradient(W * 0.85, 120, 40, W * 0.85, 120, 620)
  rg.addColorStop(0, t.a + '40'); rg.addColorStop(1, 'transparent')
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)

  ctx.textBaseline = 'middle'
  ctx.font = '52px "Space Grotesk", sans-serif'
  ctx.fillText('🔥', PAD, 110)
  ctx.fillStyle = '#F5F5F7'
  ctx.font = '700 38px "Space Grotesk", sans-serif'
  ctx.fillText('Resume Roaster', PAD + 64, 112)

  ctx.font = '700 24px "Space Mono", monospace'
  const badge = `${M.glyph} ${M.name.toUpperCase()}`
  const bw = ctx.measureText(badge).width + 44
  ctx.fillStyle = t.a + '22'
  roundRect(ctx, W - PAD - bw, 88, bw, 50, 25); ctx.fill()
  ctx.strokeStyle = t.a + '66'; ctx.lineWidth = 2
  roundRect(ctx, W - PAD - bw, 88, bw, 50, 25); ctx.stroke()
  ctx.fillStyle = t.a; ctx.textAlign = 'center'
  ctx.fillText(badge, W - PAD - bw / 2, 115)
  ctx.textAlign = 'left'

  const cx = PAD + 150, cy = 420, rad = 130
  ctx.lineWidth = 26; ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke()
  const ag = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad)
  ag.addColorStop(0, t.a); ag.addColorStop(1, t.a2)
  ctx.strokeStyle = ag
  ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * r.score / 100)); ctx.stroke()

  ctx.fillStyle = '#F5F5F7'
  ctx.font = '700 88px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(String(r.score), cx, cy - 6)
  ctx.fillStyle = t.a; ctx.font = '700 30px "Space Grotesk", sans-serif'
  ctx.fillText(r.grade + ' · ATS', cx, cy + 56)
  ctx.textAlign = 'left'

  const vx = cx + rad + 70, vw = W - PAD - vx
  ctx.fillStyle = '#9A9AA8'; ctx.font = '700 20px "Space Mono", monospace'
  ctx.fillText('THE VERDICT', vx, cy - 110)
  ctx.fillStyle = '#F5F5F7'; ctx.font = '600 42px "Space Grotesk", sans-serif'
  wrapText(ctx, '"' + r.verdict + '"', vx, cy - 60, vw, 50)

  let y = 660
  ctx.font = '700 22px "Space Mono", monospace'; ctx.fillStyle = '#9A9AA8'
  ctx.fillText('THE BREAKDOWN', PAD, y)
  y += 44
  r.sections.slice(0, 4).forEach(s => {
    ctx.fillStyle = '#C7C7D1'; ctx.font = '500 28px "Hanken Grotesk", sans-serif'
    ctx.fillText(s.label, PAD, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = s.score >= 75 ? '#4DCC88' : s.score >= 55 ? t.a : '#FF4D4D'
    ctx.font = '700 28px "Space Grotesk", sans-serif'; ctx.fillText(String(s.score), W - PAD, y)
    ctx.textAlign = 'left'
    const by = y + 22, bw2 = W - PAD * 2
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, PAD, by, bw2, 12, 6); ctx.fill()
    ctx.fillStyle = s.score >= 75 ? '#4DCC88' : s.score >= 55 ? t.a : '#FF4D4D'
    roundRect(ctx, PAD, by, bw2 * s.score / 100, 12, 6); ctx.fill()
    y += 74
  })

  ctx.fillStyle = '#56565F'; ctx.font = '400 24px "Space Mono", monospace'
  ctx.fillText('resumeroaster.app', PAD, H - 60)
  ctx.textAlign = 'right'; ctx.fillStyle = t.a
  ctx.fillText('Get yours roasted →', W - PAD, H - 60)
  ctx.textAlign = 'left'
}

/* ---- ShareModal ---- */
function ShareModal({ mode, result, onClose }: { mode: ModeId; result: AnalysisResult; onClose: () => void }) {
  const { t } = useLang()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    const c = document.createElement('canvas')
    const render = () => { drawShareCard(c, mode, result); setUrl(c.toDataURL('image/png')) }
    render()
    if (document.fonts?.ready) document.fonts.ready.then(render)
    const timer = setTimeout(render, 350)
    canvasRef.current = c
    return () => clearTimeout(timer)
  }, [mode, result])

  const download = () => {
    const a = document.createElement('a')
    a.download = `resume-roaster-${mode}.png`
    a.href = canvasRef.current!.toDataURL('image/png')
    a.click()
  }

  const share = () => {
    if (navigator.share && canvasRef.current) {
      canvasRef.current.toBlob(b => {
        const f = new File([b!], 'roast.png', { type: 'image/png' })
        navigator.share({ files: [f], title: 'My Resume Roast', text: `I scored ${result.score} on Resume Roaster 🔥` }).catch(() => {})
      })
    } else { download() }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', background: 'rgba(5,5,8,0.78)', backdropFilter: 'blur(8px)', animation: 'fadeIn .25s both', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={cardStyle({ padding: 26, maxWidth: 460, width: '100%', animation: 'pop .3s both' })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 21 }}>{t.shareModalTitle}</h3>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--line-2)', color: 'var(--ink-mute)', display: 'grid', placeItems: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-2)', background: '#0b0b10', aspectRatio: '1/1' }}>
          {url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt="Share card" style={{ width: '100%', display: 'block' }} />
            : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-mute)' }}>{t.rendering}</div>}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Button full icon="download" onClick={download}>{t.downloadPng}</Button>
          <Button variant="ghost" icon="share" onClick={share}>{t.share}</Button>
        </div>
        <p className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 14 }}>
          {t.shareFooter}
        </p>
      </div>
    </div>
  )
}

/* ---- SectionRow ---- */
function SectionRow({ s, run, i }: { s: AnalysisResult['sections'][0]; run: boolean; i: number }) {
  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid var(--line)', animation: run ? `fadeUp .5s ${0.1 + i * 0.07}s both` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>{s.label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: s.score >= 75 ? 'var(--intl)' : s.score >= 55 ? 'var(--accent)' : 'var(--roast)' }}>
          {s.score}<span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>/100</span>
        </span>
      </div>
      <ScoreBar score={s.score} run={run} delay={i * 70} />
      <p style={{ fontSize: 14.5, color: 'var(--ink-mute)', marginTop: 11, lineHeight: 1.55 }}>{s.note}</p>
    </div>
  )
}

/* ---- ListBlock ---- */
function ListBlock({ icon, title, items, tone, run }: { icon: string; title: string; items: string[]; tone: 'win'|'fix'|'flag'; run: boolean }) {
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
          <div key={i} style={{ display: 'flex', gap: 12, animation: run ? `fadeUp .5s ${0.15 + i * 0.06}s both` : 'none' }}>
            <span style={{ flexShrink: 0, marginTop: 6, width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{it}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- Results ---- */
interface ResultsProps {
  mode: ModeId
  setMode: (m: ModeId) => void
  file: File | null
  result: AnalysisResult
  onReanalyze: (toStep?: string) => void
}

export default function Results({ mode, setMode, file, result, onReanalyze }: ResultsProps) {
  const { t } = useLang()
  const m = MODES[mode]
  const tm = t.modes[mode]
  const [typed, setTyped] = useState(false)
  const [share, setShare] = useState(false)
  const [shareId, setShareId] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setTyped(false); setShareId(null); setCopied(false) }, [mode])

  const copyShareLink = async () => {
    setCopying(true)
    try {
      let id = shareId
      if (!id) {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, result }),
        })
        const data = await res.json() as { id: string }
        id = data.id
        setShareId(id)
      }
      await navigator.clipboard.writeText(`${window.location.origin}/r/${id}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Copy share link failed:', err)
    } finally {
      setCopying(false)
    }
  }

  const scoreDesc = result.score >= 75 ? t.scoreHigh : result.score >= 60 ? t.scoreMid : t.scoreLow

  return (
    <div style={{ animation: 'fadeIn .4s both', minHeight: '100vh' }}>
      {/* Sticky top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px clamp(20px,5vw,60px)', background: 'color-mix(in srgb, var(--bg) 72%, transparent)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}>
        <Button variant="quiet" size="sm" icon="back" onClick={() => onReanalyze('upload')}>{t.newAnalysis}</Button>
        <Logo size={24} />
        <Button size="sm" icon="share" onClick={() => setShare(true)}>{t.shareYourRoast}</Button>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(28px,4vw,52px) clamp(20px,5vw,60px) 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Pill tone="accent">{m.glyph} {tm.name}</Pill>
          {file && (
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Icon name="doc" size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />{file.name}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 'clamp(30px,5vw,58px)', maxWidth: 900, minHeight: '1.1em' }}>
          &quot;<Typewriter text={result.verdict} run={!typed} onDone={() => setTyped(true)} />&quot;
        </h1>
        <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: 'var(--ink-soft)', maxWidth: 780, marginTop: 20, lineHeight: 1.6 }}>
          {result.summary}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 22, marginTop: 40, alignItems: 'start' }} className="results-grid">

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={cardStyle({ padding: 26 })}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 style={{ fontSize: 19 }}>{t.theBreakdown}</h3>
                <span className="eyebrow">{result.sections.length} {t.sectionsSuffix}</span>
              </div>
              {result.sections.map((s, i) => <SectionRow key={s.label} s={s} i={i} run />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }} className="lists-grid">
              <ListBlock icon="star" title={t.whatsWorking} items={result.wins}  tone="win"  run />
              <ListBlock icon="flag" title={t.redFlags}     items={result.flags} tone="flag" run />
            </div>
            <ListBlock icon="bolt" title={t.fixTheseFirst} items={result.fixes} tone="fix" run />
          </div>

          <div style={{ position: 'sticky', top: 90, display: 'flex', flexDirection: 'column', gap: 18 }} className="results-aside">
            <div style={cardStyle({ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 240, height: 160, background: 'radial-gradient(circle, var(--glow), transparent 70%)', pointerEvents: 'none' }} />
              <span className="eyebrow" style={{ position: 'relative' }}>{t.overallAtsScore}</span>
              <div style={{ position: 'relative', margin: '18px 0 8px' }}>
                <ScoreRing score={result.score} size={200} grade={result.grade} />
              </div>
              <p style={{ position: 'relative', fontSize: 14.5, color: 'var(--ink-mute)', maxWidth: 240 }}>
                {scoreDesc}
              </p>
              <Button full icon="share" onClick={() => setShare(true)} style={{ position: 'relative', marginTop: 22 }}>
                {t.shareYourRoast}
              </Button>
              <button
                onClick={copyShareLink}
                disabled={copying}
                style={{
                  position: 'relative', marginTop: 10, width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 18px', borderRadius: 'var(--r-md)', cursor: copying ? 'wait' : 'pointer',
                  background: copied ? 'color-mix(in srgb, var(--intl) 14%, var(--surface-2))' : 'var(--surface-2)',
                  border: `1px solid ${copied ? 'var(--intl)' : 'var(--line-2)'}`,
                  color: copied ? 'var(--intl)' : 'var(--ink-mute)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  transition: 'all .2s',
                }}
              >
                <Icon name={copied ? 'check' : 'link'} size={15} />
                {copied ? t.shareLinkCopied : copying ? t.shareLinkSaving : t.shareLinkCopy}
              </button>
            </div>

            {/* Mode switcher */}
            <div style={cardStyle({ padding: 22 })}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>{t.sameLens}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 16 }}>{t.reRunInstantly}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MODE_ORDER.map(id => {
                  const mm = MODES[id]; const active = id === mode
                  const modeResult = CANNED[id]
                  const mml = t.modes[id]
                  return (
                    <button key={id}
                      onClick={() => { if (!active) { setMode(id); window.scrollTo({ top: 0 }) } }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, textAlign: 'left', background: active ? `color-mix(in srgb, ${mm.accent} 14%, var(--surface-2))` : 'var(--surface-2)', border: `1px solid ${active ? mm.accent : 'var(--line)'}`, cursor: active ? 'default' : 'pointer', transition: 'all .2s' }}>
                      <span style={{ fontSize: 22 }}>{mm.glyph}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, display: 'block' }}>{mml.name}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{t.scoreLabel} {modeResult.score} · {modeResult.grade}</span>
                      </span>
                      {active
                        ? <Pill tone="accent" style={{ padding: '4px 9px', fontSize: 10 }}>{t.viewing}</Pill>
                        : <span style={{ color: mm.accent }}><Icon name="refresh" size={17} /></span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {share && <ShareModal mode={mode} result={result} onClose={() => setShare(false)} />}
    </div>
  )
}
