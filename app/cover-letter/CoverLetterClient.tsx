'use client'

import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { useLang } from '@/lib/LangContext'
import { cardStyle } from '@/components/Landing'

export default function CoverLetterPage() {
  const { t } = useLang()

  const [resumeText, setResumeText]   = useState('')
  const [jobDesc, setJobDesc]         = useState('')
  const [letter, setLetter]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [fieldError, setFieldError]   = useState('')
  const [copied, setCopied]           = useState(false)

  /* ── input styles ── */
  const ta: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '14px 16px',
    background: 'var(--surface-2)',
    border: '1px solid var(--line-2)',
    borderRadius: 'var(--r-md)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 14.5,
    lineHeight: 1.6,
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color .2s',
  }

  const lbl: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '.08em',
    color: 'var(--ink-mute)',
    marginBottom: 8,
  }

  /* ── generate ── */
  const generate = async () => {
    if (!resumeText.trim()) { setFieldError(t.clEmptyResume); return }
    if (!jobDesc.trim())    { setFieldError(t.clEmptyJob);    return }
    setFieldError('')
    setError('')
    setLoading(true)
    setLetter('')
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: resumeText.trim(), jobDescription: jobDesc.trim() }),
      })
      const data = await res.json() as { letter?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'failed')
      setLetter(data.letter ?? '')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg && msg !== 'failed' ? msg : t.clApiError)
    } finally {
      setLoading(false)
    }
  }

  /* ── copy ── */
  const copy = async () => {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  /* ── download ── */
  const download = () => {
    const blob = new Blob([letter], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'cover-letter.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(20px,5vw,60px)',
        background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--line)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink-soft)' }}>
          {t.clTitle}
        </span>
        <Link href="/" style={{
          textDecoration: 'none', fontSize: 14, color: 'var(--ink-mute)',
          fontFamily: 'var(--font-body)', padding: '8px 14px', transition: 'color .2s',
        }}>{t.clBackHome}</Link>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(36px,5vw,64px) clamp(20px,5vw,60px) 90px' }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: 40, animation: 'fadeUp .45s both' }}>
          <span style={{
            display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '.12em', color: 'var(--accent)', marginBottom: 14,
          }}>{t.clEyebrow}</span>
          <h1 style={{ fontSize: 'clamp(30px,4.5vw,54px)', fontWeight: 700, lineHeight: 1.08 }}>
            {t.clTitle}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', marginTop: 14, maxWidth: 540, lineHeight: 1.6 }}>
            {t.clSubtitle}
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: letter ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)',
          gap: 24,
          alignItems: 'start',
        }} className="hero-grid">

          {/* ── LEFT: inputs ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Resume textarea */}
            <div style={cardStyle({ padding: 'clamp(20px,3vw,28px)' })}>
              <label style={lbl}>{t.clResumeLabel}</label>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder={t.clResumePlaceholder}
                rows={12}
                style={ta}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')}
              />
            </div>

            {/* Job description textarea */}
            <div style={cardStyle({ padding: 'clamp(20px,3vw,28px)' })}>
              <label style={lbl}>{t.clJobLabel}</label>
              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder={t.clJobPlaceholder}
                rows={10}
                style={ta}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')}
              />
            </div>

            {/* Validation / API error */}
            {(fieldError || error) && (
              <div style={{
                padding: '12px 18px', borderRadius: 'var(--r-md)', fontSize: 14,
                background: 'color-mix(in srgb, var(--roast) 10%, var(--surface-2))',
                border: '1px solid color-mix(in srgb, var(--roast) 30%, transparent)',
                color: 'var(--roast)',
              }}>
                {fieldError || error}
              </div>
            )}

            {/* Generate button */}
            <Button
              size="lg"
              icon={loading ? undefined : 'spark'}
              onClick={generate}
              disabled={loading}
              style={{ alignSelf: 'flex-start' }}
            >
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    {t.clGenerating}
                  </span>
                : t.clGenerate}
            </Button>
          </div>

          {/* ── RIGHT: result ── */}
          {letter && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp .5s both' }}>
              <div style={cardStyle({ padding: 'clamp(20px,3vw,28px)' })}>
                {/* Result header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                      <Icon name="doc" size={15} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{t.clResult}</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{t.clEditHint}</span>
                </div>

                {/* Editable letter textarea */}
                <textarea
                  value={letter}
                  onChange={e => setLetter(e.target.value)}
                  rows={22}
                  style={{
                    ...ta,
                    lineHeight: 1.75,
                    fontSize: 15,
                    minHeight: 400,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                />

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  <button
                    onClick={copy}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '11px 20px', borderRadius: 'var(--r-md)',
                      background: copied
                        ? 'color-mix(in srgb, var(--intl) 14%, var(--surface-2))'
                        : 'linear-gradient(140deg, var(--accent), var(--accent-2))',
                      border: copied ? '1px solid var(--intl)' : 'none',
                      color: copied ? 'var(--intl)' : 'var(--accent-ink)',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                      cursor: 'pointer', transition: 'all .2s',
                    }}
                  >
                    <Icon name={copied ? 'check' : 'link'} size={15} />
                    {copied ? t.clCopied : t.clCopy}
                  </button>

                  <button
                    onClick={download}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '11px 20px', borderRadius: 'var(--r-md)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line-2)',
                      color: 'var(--ink-soft)',
                      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                      cursor: 'pointer', transition: 'all .2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--ink)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--ink-soft)' }}
                  >
                    <Icon name="download" size={15} />
                    {t.clDownload}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '26px clamp(20px,5vw,60px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <Logo size={24} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
          {t.footer}
        </span>
      </footer>
    </div>
  )
}
