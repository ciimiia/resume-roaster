'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import Logo from '@/components/ui/Logo'
import { useLang } from '@/lib/LangContext'
import { useSession } from '@/lib/SessionContext'
import { cardStyle } from '@/lib/styles'

const ERROR_MAP: Record<string, keyof ReturnType<typeof useLang>['t']> = {
  EMAIL_EXISTS:      'authErrorExists',
  PASSWORD_WEAK:     'authErrorWeak',
  CONSENT_REQUIRED:  'authConsentRequired',
}

export default function SignUpPage() {
  const { t } = useLang()
  const { refresh } = useSession()
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    background: 'var(--surface-2)', border: '1px solid var(--line-2)',
    borderRadius: 'var(--r-md)', color: 'var(--ink)',
    fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
    transition: 'border-color .2s',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)',
    letterSpacing: '.08em', color: 'var(--ink-mute)', marginBottom: 8,
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError(t.authErrorMismatch); return }
    if (password.length < 8)  { setError(t.authErrorWeak);    return }
    if (!consentAccepted)     { setError(t.authConsentRequired); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, consentAccepted }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        const key = ERROR_MAP[data.error ?? ''] ?? 'authErrorServer'
        setError(t[key] as string)
        return
      }
      await refresh()
      router.push('/dashboard')
    } catch {
      setError(t.authErrorServer)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--sp-8) var(--sp-5)', position: 'relative' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-6)' }}>
          <Logo size={28} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-7)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{t.authSignUpTitle}</h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-mute)', lineHeight: 1.55 }}>{t.authSignUpSubtitle}</p>
        </div>

        <div style={cardStyle({ padding: 'var(--sp-7)' })}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            <div>
              <label style={lbl}>{t.authEmail}</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={inp} autoComplete="email"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')} />
            </div>
            <div>
              <label style={lbl}>{t.authPassword}</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                style={inp} autoComplete="new-password"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')} />
            </div>
            <div>
              <label style={lbl}>{t.authConfirmPassword}</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                style={inp} autoComplete="new-password"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-mute)', cursor: 'pointer' }}>
              <input type="checkbox" checked={consentAccepted} onChange={e => setConsentAccepted(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }} required />
              <span>
                {t.authConsentPrefix}
                <Link href="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>{t.authConsentPrivacy}</Link>
                {t.authConsentAnd}
                <Link href="/terms" target="_blank" style={{ color: 'var(--accent)' }}>{t.authConsentTerms}</Link>
              </span>
            </label>

            {error && (
              <div style={{ padding: '11px 16px', borderRadius: 'var(--r-md)', fontSize: 14,
                background: 'color-mix(in srgb, var(--roast) 10%, var(--surface-2))',
                border: '1px solid color-mix(in srgb, var(--roast) 30%, transparent)',
                color: 'var(--roast)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="x" size={14} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading || !consentAccepted} style={{
              padding: '13px', borderRadius: 'var(--r-md)', border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
              color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading || !consentAccepted ? 0.6 : 1, transition: 'opacity .2s',
            }}>
              {loading
                ? <><span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> {t.signUp}</>
                : t.signUp}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 'var(--sp-5)', fontSize: 14, color: 'var(--ink-mute)' }}>
          <Link href="/signin" style={{ color: 'var(--accent)', textDecoration: 'none', transition: 'opacity .2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >{t.authSignInLink}</Link>
        </p>
      </div>
    </div>
  )
}
