'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { useLang } from '@/lib/LangContext'
import { cardStyle } from '@/lib/styles'

function ResetPasswordForm() {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/auth/password-reset-status').then(r => r.json()).then(d => {
      if (!d.enabled) router.replace('/signin')
      setChecked(true)
    }).catch(() => router.replace('/signin'))
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError(t.authErrorMismatch); return }
    if (password.length < 8) { setError(t.authErrorWeak); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error === 'INVALID_OR_EXPIRED_TOKEN' ? t.authResetErrorInvalidToken : t.authErrorServer)
        return
      }
      setSuccess(true)
    } catch {
      setError(t.authErrorServer)
    } finally {
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
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{t.authResetPasswordTitle}</h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-mute)', lineHeight: 1.55 }}>{t.authResetPasswordSubtitle}</p>
        </div>
        <div style={cardStyle({ padding: 'var(--sp-7)' })}>
          {success ? (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t.authResetPasswordSuccess}</p>
              <Link href="/signin" style={{ color: 'var(--accent)', fontSize: 14 }}>{t.authSignInLink}</Link>
            </>
          ) : !token ? (
            <p style={{ fontSize: 14, color: 'var(--danger)' }}>{t.authResetErrorInvalidToken}</p>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inp} autoComplete="new-password" placeholder={t.authPassword} />
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} style={inp} autoComplete="new-password" placeholder={t.authConfirmPassword} />
              {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{
                padding: '13px', borderRadius: 'var(--r-md)', border: 'none', cursor: loading ? 'wait' : 'pointer',
                background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
                color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                opacity: loading ? 0.7 : 1,
              }}>
                {t.authResetPasswordSubmitBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
