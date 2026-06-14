'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import Icon from '@/components/ui/Icon'
import { useLang } from '@/lib/LangContext'
import { useSession } from '@/lib/SessionContext'
import { cardStyle } from '@/components/Landing'

const ERROR_MAP: Record<string, keyof ReturnType<typeof useLang>['t']> = {
  INVALID_CREDENTIALS: 'authErrorInvalid',
}

export default function SignInPage() {
  const { t } = useLang()
  const { refresh } = useSession()
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px',
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
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        const key = ERROR_MAP[data.error ?? ''] ?? 'authErrorInvalid'
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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}><Logo /></Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>{t.authSignInTitle}</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-mute)', lineHeight: 1.55 }}>{t.authSignInSubtitle}</p>
        </div>

        <div style={cardStyle({ padding: 32 })}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                style={inp} autoComplete="current-password"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')} />
            </div>

            {error && (
              <div style={{ padding: '11px 16px', borderRadius: 'var(--r-md)', fontSize: 14,
                background: 'color-mix(in srgb, var(--roast) 10%, var(--surface-2))',
                border: '1px solid color-mix(in srgb, var(--roast) 30%, transparent)',
                color: 'var(--roast)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="x" size={14} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: '13px', borderRadius: 'var(--r-md)', border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
              color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1, transition: 'opacity .2s',
            }}>
              {loading
                ? <><span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> {t.signIn}</>
                : t.signIn}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--ink-mute)' }}>
          <Link href="/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{t.authSignUpLink}</Link>
        </p>
      </div>
    </div>
  )
}
