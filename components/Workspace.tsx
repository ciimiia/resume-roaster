'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MODES, MODE_ORDER, LOADING_LINES, SAMPLE_RESUME, EMPTY_STATES } from '@/lib/data'
import type { ModeId, Step, AnalysisResult } from '@/lib/types'
import Button from './ui/Button'
import Icon from './ui/Icon'
import Pill from './ui/Pill'
import { ModeSelectorCard, cardStyle } from './Landing'

/* ---- StepRail ---- */
function StepRail({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'mode',      label: 'Choose mode' },
    { id: 'upload',    label: 'Upload resume' },
    { id: 'analyzing', label: 'Analyzing' },
  ]
  const idx = steps.findIndex(s => s.id === step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
              background: i <= idx ? 'linear-gradient(140deg, var(--accent), var(--accent-2))' : 'var(--surface-3)',
              color: i <= idx ? 'var(--accent-ink)' : 'var(--ink-faint)',
              transition: 'all .3s',
            }}>
              {i < idx ? <Icon name="check" size={14} stroke={2.4} /> : i + 1}
            </div>
            <span style={{
              fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 600,
              color: i === idx ? 'var(--ink)' : i < idx ? 'var(--ink-mute)' : 'var(--ink-faint)',
              transition: 'color .3s',
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 40, height: 1,
              background: i < idx ? 'var(--accent)' : 'var(--line-2)',
              margin: '0 12px', transition: 'background .3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ---- UploadZone ---- */
function UploadZone({
  file, onFile, onSample,
}: {
  file: File | null
  onFile: (f: File) => void
  onSample: () => void
}) {
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') { setError(EMPTY_STATES.error); return }
    if (f.size > 10 * 1024 * 1024)   { setError(EMPTY_STATES.error); return }
    setError('')
    onFile(f)
  }, [onFile])

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? 'var(--accent)' : file ? 'var(--accent)' : 'var(--line-2)'}`,
          borderRadius: 'var(--r-lg)',
          background: drag ? 'color-mix(in srgb, var(--accent) 6%, var(--surface))' : file ? 'color-mix(in srgb, var(--accent) 4%, var(--surface))' : 'var(--surface)',
          padding: 'clamp(40px, 6vw, 80px) 40px',
          textAlign: 'center', cursor: 'pointer',
          transition: 'all .2s', position: 'relative', overflow: 'hidden',
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        {file ? (
          <div style={{ animation: 'fadeUp .4s both' }}>
            <div style={{ width: 64, height: 64, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--accent) 18%, transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: 'var(--accent)' }}>
              <Icon name="doc" size={32} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{file.name}</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginTop: 6 }}>
              {(file.size / 1024).toFixed(0)} KB · Click to replace
            </div>
          </div>
        ) : (
          <div>
            <div style={{ width: 64, height: 64, borderRadius: 'var(--r-md)', background: 'var(--surface-3)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: 'var(--ink-mute)', animation: 'floaty 3s ease-in-out infinite' }}>
              <Icon name="upload" size={32} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>
              {drag ? EMPTY_STATES.dragHint : 'Drop your PDF here'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 8 }}>
              or click to browse · PDF only · max 10 MB
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: '12px 18px', borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, var(--roast) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--roast) 30%, transparent)', color: 'var(--roast)', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <button
        onClick={onSample}
        style={{ marginTop: 14, width: '100%', padding: '14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--ink-soft)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--ink)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--ink-soft)' }}
      >
        <Icon name="spark" size={16} /> Use sample resume
      </button>
    </div>
  )
}

/* ---- FauxResume (scan animation) ---- */
function FauxResume() {
  return (
    <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '28px 24px', position: 'relative', overflow: 'hidden', minHeight: 380, boxShadow: 'var(--shadow-2)' }}>
      {/* scan beam */}
      <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', animation: 'scanmove 2s linear infinite', opacity: 0.85, zIndex: 2 }} />
      <div style={{ color: '#111', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{SAMPLE_RESUME.name}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{SAMPLE_RESUME.title}</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{SAMPLE_RESUME.contact}</div>
      </div>
      <div style={{ height: 1, background: '#ddd', marginBottom: 14 }} />
      {SAMPLE_RESUME.blocks.map((block, bi) => (
        <div key={bi} style={{ marginBottom: 16 }}>
          {block.h && <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#888', fontWeight: 700, marginBottom: 7 }}>{block.h}</div>}
          {block.lines.map((w, li) => (
            <div key={li} style={{ height: 8, borderRadius: 4, background: `rgba(0,0,0,${0.07 + (1 - w) * 0.04})`, width: `${w * 100}%`, marginBottom: 6 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ---- Workspace ---- */
interface WorkspaceProps {
  mode: ModeId
  setMode: (m: ModeId) => void
  step: Step
  setStep: (s: Step) => void
  file: File | null
  setFile: (f: File | null) => void
  onAnalyze: (result: AnalysisResult) => void
}

export default function Workspace({ mode, setMode, step, setStep, file, setFile, onAnalyze }: WorkspaceProps) {
  const [lineIdx, setLineIdx] = useState(0)
  const [analyzeError, setAnalyzeError] = useState('')
  const usingSample = useRef(false)

  // Rotate loading lines while analyzing
  useEffect(() => {
    if (step !== 'analyzing') return
    const id = setInterval(() => setLineIdx(v => (v + 1) % LOADING_LINES[mode].length), 1800)
    return () => clearInterval(id)
  }, [step, mode])

  // Fire API call when analyzing step begins
  useEffect(() => {
    if (step !== 'analyzing') return
    const run = async () => {
      try {
        const formData = new FormData()
        if (usingSample.current || !file) {
          formData.append('useSampleText', 'true')
        } else {
          formData.append('file', file)
        }
        formData.append('mode', mode)

        const res = await fetch('/api/analyze', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('API error')
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        onAnalyze(result)
      } catch (err) {
        console.error(err)
        setAnalyzeError('API unavailable — showing sample analysis.')
        const { RESULTS } = await import('@/lib/data')
        onAnalyze(RESULTS[mode])
      }
    }
    const t = setTimeout(run, 2400)   // let the animation play a beat first
    return () => clearTimeout(t)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,60px)' }}>
      <StepRail step={step} />

      {/* ── STEP: mode ── */}
      {step === 'mode' && (
        <div style={{ animation: 'fadeUp .5s both' }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 'clamp(26px,4vw,38px)' }}>Choose your mode</h2>
            <p style={{ fontSize: 16, color: 'var(--ink-mute)', marginTop: 8 }}>Each mode reads your resume with a different agenda.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="modes-grid">
            {MODE_ORDER.map(id => (
              <ModeSelectorCard key={id} mode={MODES[id]} active={mode === id} onPick={() => setMode(id)} />
            ))}
          </div>
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="lg" iconRight="arrow" onClick={() => setStep('upload')}>
              Continue with {MODES[mode].glyph} {MODES[mode].name}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: upload ── */}
      {step === 'upload' && (
        <div style={{ animation: 'fadeUp .5s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <Button variant="quiet" size="sm" icon="back" onClick={() => setStep('mode')}>Back</Button>
            <Pill tone="accent">{MODES[mode].glyph} {MODES[mode].name}</Pill>
          </div>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 'clamp(26px,4vw,38px)' }}>Upload your resume</h2>
            <p style={{ fontSize: 16, color: 'var(--ink-mute)', marginTop: 8 }}>PDF only · max 10 MB.</p>
          </div>
          <UploadZone
            file={file}
            onFile={f => { usingSample.current = false; setFile(f) }}
            onSample={() => { usingSample.current = true; setStep('analyzing') }}
          />
          {file && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="lg" icon="spark"
                onClick={() => { usingSample.current = false; setStep('analyzing') }}>
                {MODES[mode].cta} →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: analyzing ── */}
      {step === 'analyzing' && (
        <div style={{ animation: 'fadeUp .5s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <Pill tone="accent">{MODES[mode].glyph} {MODES[mode].name}</Pill>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="hero-grid">
            <FauxResume />
            <div>
              {/* spinner */}
              <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid var(--surface-3)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite', marginBottom: 28 }} />
              <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', lineHeight: 1.2 }}>Analyzing your resume…</h2>
              <p key={lineIdx} style={{ fontSize: 16, color: 'var(--accent)', marginTop: 14, fontFamily: 'var(--font-mono)', animation: 'fadeUp .4s both' }}>
                {LOADING_LINES[mode][lineIdx]}
              </p>
              <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Parsing structure','Scanning keywords','Scoring sections','Generating verdict'].map((label, i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 20%, transparent)', border: '1.5px solid var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
                      <Icon name="check" size={10} stroke={2.5} />
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--ink-mute)' }}>{label}</span>
                  </div>
                ))}
              </div>
              {analyzeError && <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 16 }}>{analyzeError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
