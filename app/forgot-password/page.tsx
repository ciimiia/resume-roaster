'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { useLang } from '@/lib/LangContext'
import { cardStyle } from '@/lib/styles'

export default function ForgotPasswordPage() {
  const { t } = useLang()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/auth/password-reset-status').then(r => r.json()).then(d => {
      if (!d.enabled) router.replace('/signin') // feature hidden entirely when unconfigured
      setChecked(true)
    }).catch(() => router.replace('/signin'))
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
    } finally {
      setSent(true) // same response shown regardless of outcome — no enumeration
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    background: 'var(--surface-2)', border: '1px solid var(--line-2)',
    borderRadius: 'var(--r-md)', color: 'var(--ink)', fontSize: 15, outline: 'none',
  }

  if (!checked) return null

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--sp-8) var(--sp-5)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-6)' }}><Logo size={28} /></div>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-7)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{t.authForgotPasswordTitle}</h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-mute)', lineHeight: 1.55 }}>{t.authForgotPasswordSubtitle}</p>
        </div>
        <div style={cardStyle({ padding: 'var(--sp-7)' })}>
          {sent ? (
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{t.authForgotPasswordSent}</p>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inp} autoComplete="email" placeholder={t.authEmail} />
              <button type="submit" disabled={loading} style={{
                padding: '13px', borderRadius: 'var(--r-md)', border: 'none', cursor: loading ? 'wait' : 'pointer',
                background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
                color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                opacity: loading ? 0.7 : 1,
              }}>
                {t.authForgotPasswordSubmitBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
