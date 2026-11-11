'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { useLang } from '@/lib/LangContext'
import { cardStyle } from '@/lib/styles'
import { parseExplorerQuery } from '@/lib/explorerQuery'
import { WORLD_COUNTRIES } from '@/lib/worldMapData'

const ISO_TO_NAME = new Map(WORLD_COUNTRIES.map(c => [c.iso, c.name]))

export default function UniversitiesPage() {
  return (
    <Suspense fallback={null}>
      <UniversitiesInner />
    </Suspense>
  )
}

function UniversitiesInner() {
  const { t } = useLang()
  const searchParams = useSearchParams()
  const picked = parseExplorerQuery(searchParams)
  const countryNames = picked.countries.map(iso => ISO_TO_NAME.get(iso)).filter((n): n is string => !!n)
  const level = picked.track === 'study' ? picked.level : ''
  const field = picked.track === 'study' ? picked.field : ''

  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) {
      setError(t.uniConsentRequired)
      return
    }
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/universities/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consentAccepted: consent, countries: picked.countries, level: level || null, field: field || null }),
      })
      if (res.status === 429) {
        setState('error'); setError(t.uniRateLimited); return
      }
      const data = await res.json() as { ok?: boolean }
      if (!res.ok || !data.ok) {
        setState('error'); setError(t.uniGenericError); return
      }
      setState('done')
    } catch {
      setState('error'); setError(t.uniGenericError)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    background: 'var(--surface-2)', border: '1px solid var(--line-2)',
    borderRadius: 'var(--r-md)', color: 'var(--ink)', fontSize: 15, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--sp-8) var(--sp-5)' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-6)' }}><Logo size={28} /></div>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
          <span style={{
            display: 'inline-block', padding: '5px 12px', borderRadius: 999, background: 'var(--tint)',
            color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, marginBottom: 'var(--sp-3)',
          }}>
            {t.uniComingSoon}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{t.uniTitle}</h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-mute)', lineHeight: 1.6 }}>{t.uniBody}</p>
        </div>

        <div style={cardStyle({ padding: 'var(--sp-7)' })}>
          {countryNames.length === 0 ? (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-mute)', marginBottom: 'var(--sp-5)' }}>{t.uniNoSelection}</p>
          ) : (
            <div style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 'var(--sp-5)' }}>
              {countryNames.join(', ')}{field ? ` · ${field}` : ''}{level ? ` · ${level}` : ''}
            </div>
          )}

          {state === 'done' ? (
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{t.uniSubmitted}</p>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inp} autoComplete="email" placeholder={t.uniEmailPlaceholder} />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-mute)', cursor: 'pointer' }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
                {t.uniConsentLabel}
              </label>
              {error && <p style={{ color: 'var(--roast)', fontSize: 13 }}>{error}</p>}
              <button type="submit" disabled={state === 'loading'} style={{
                padding: '13px', borderRadius: 'var(--r-md)', border: 'none', cursor: state === 'loading' ? 'wait' : 'pointer',
                background: 'var(--accent)', color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                opacity: state === 'loading' ? 0.7 : 1,
              }}>
                {t.uniSubmitBtn}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--sp-5)' }}>
          <Link href="/#explorer" style={{ fontSize: 13.5, color: 'var(--ink-mute)', textDecoration: 'none' }}>{t.uniBackLink}</Link>
        </div>
      </div>
    </div>
  )
}
