'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from './ui/Logo'
import ThemeToggle from './ui/ThemeToggle'
import { useLang } from '@/lib/LangContext'
import { useSession } from '@/lib/SessionContext'

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      background: 'var(--surface-2)', border: '1px solid var(--line-2)',
      borderRadius: 8, padding: 3,
    }}>
      {(['en', 'fa'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            background: lang === l ? 'var(--accent)' : 'none',
            color: lang === l ? 'var(--accent-ink)' : 'var(--ink-mute)',
            border: 'none', borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            padding: '4px 9px', cursor: 'pointer', transition: 'all .2s',
            letterSpacing: '.04em',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function UserNav() {
  const { t } = useLang()
  const { user, loading } = useSession()
  const router = useRouter()

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.refresh()
    window.location.href = '/'
  }

  if (loading) return null

  if (!user) {
    return (
      <Link href="/signin" style={{
        fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none',
        padding: '7px 14px', borderRadius: 'var(--r-md)',
        border: '1px solid var(--line-2)', background: 'var(--surface-2)',
        transition: 'color .2s', whiteSpace: 'nowrap',
      }}>{t.signIn}</Link>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {user.isAdmin && (
        <Link href="/admin" style={{
          fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
          padding: '5px 11px', borderRadius: 'var(--r-md)',
          border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
          background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
          fontFamily: 'var(--font-mono)', letterSpacing: '.04em', whiteSpace: 'nowrap',
        }}>{t.adminNav}</Link>
      )}
      <Link href="/dashboard" style={{
        fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none',
        padding: '7px 14px', borderRadius: 'var(--r-md)',
        border: '1px solid var(--line-2)', background: 'var(--surface-2)',
        whiteSpace: 'nowrap',
      }}>
        {user.email.split('@')[0]}
      </Link>
      <button onClick={signOut} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--ink-mute)', fontSize: 12, padding: 0, whiteSpace: 'nowrap',
      }}>{t.signOut}</button>
    </div>
  )
}

export default function Navbar() {
  const { t } = useLang()

  const linkStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--ink-mute)',
    fontFamily: 'var(--font-body)', fontSize: 15,
    padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block',
    transition: 'color .2s', whiteSpace: 'nowrap',
  }

  const links = [
    { label: t.navHowItWorks, href: '/#how-it-works' },
    { label: t.navModes,       href: '/#modes' },
    { label: t.navBlog,        href: '/blog' },
    { label: t.navBuilder,     href: '/builder' },
    { label: t.clTitle,        href: '/cover-letter' },
    { label: t.navTheApp,      href: '/' },
  ]

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px clamp(20px, 5vw, 60px)',
      background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
      backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)',
    }}>
      <Logo />

      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-links">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={linkStyle}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-mute)')}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ThemeToggle />
        <LangToggle />
        <UserNav />
      </div>
    </header>
  )
}
