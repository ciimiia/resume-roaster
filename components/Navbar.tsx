'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
      <Link href="/jobs" style={{
        fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none',
        padding: '7px 14px', borderRadius: 'var(--r-md)',
        border: '1px solid var(--line-2)', background: 'var(--surface-2)',
        whiteSpace: 'nowrap',
      }}>
        {t.jobsTitle}
      </Link>
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

function ToolsDropdown({ linkStyle }: { linkStyle: (isActive: boolean) => React.CSSProperties }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const items = [
    { label: t.navToolsRoast, href: '/#modes-section' },
    { label: t.navBuilder, href: '/builder' },
    { label: t.clTitle, href: '/cover-letter' },
  ]
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{ ...linkStyle(false), background: 'none', border: 'none', font: 'inherit' }}
      >
        {t.navTools}
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: '100%', insetInlineStart: 0, marginTop: 4, minWidth: 200,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-2)', padding: 6, zIndex: 50,
        }}>
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: 'block', padding: '9px 12px', borderRadius: 8,
                color: 'var(--ink)', fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { t } = useLang()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'none',
    border: 'none', color: isActive ? 'var(--ink)' : 'var(--ink-mute)',
    fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: isActive ? 600 : 400,
    padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block',
    transition: 'color .2s var(--ease-out), background .2s var(--ease-out)',
    whiteSpace: 'nowrap',
  })

  const links = [
    { label: t.navJobs,          href: '/jobs', trackActive: true },
    { label: t.navUniversities,  href: '/universities', trackActive: true },
    { label: t.navBlog,          href: '/blog', trackActive: true },
  ]
  const isLinkActive = (href: string, trackActive: boolean) =>
    trackActive && (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--sp-4) var(--gutter)',
      background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
      backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)',
    }}>
      <Logo />

      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-links">
        {links.slice(0, 2).map(link => {
          const isActive = isLinkActive(link.href, link.trackActive)
          return (
            <Link
              key={link.href}
              href={link.href}
              style={linkStyle(isActive)}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--ink)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--ink-mute)' }}
            >
              {link.label}
            </Link>
          )
        })}
        <ToolsDropdown linkStyle={linkStyle} />
        {links.slice(2).map(link => {
          const isActive = isLinkActive(link.href, link.trackActive)
          return (
            <Link
              key={link.href}
              href={link.href}
              style={linkStyle(isActive)}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--ink)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--ink-mute)' }}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ThemeToggle />
        <LangToggle />
        <UserNav />
        <button
          className="nav-burger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'none',
            background: 'var(--surface-2)', border: '1px solid var(--line-2)',
            borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4,
          }}
        >
          <span style={{ width: 16, height: 2, background: 'var(--ink-mute)', borderRadius: 2 }} />
          <span style={{ width: 16, height: 2, background: 'var(--ink-mute)', borderRadius: 2 }} />
          <span style={{ width: 16, height: 2, background: 'var(--ink-mute)', borderRadius: 2 }} />
        </button>
      </div>

      {menuOpen && (
        <nav
          className="nav-links-mobile"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            display: 'flex', flexDirection: 'column', gap: 2,
            padding: '10px var(--gutter) 16px',
            background: 'var(--bg)', borderBottom: '1px solid var(--line)',
            animation: 'fadeUp .25s var(--ease-out) both',
          }}
        >
          {[...links.slice(0, 2),
            { label: t.navToolsRoast, href: '/#modes-section', trackActive: false },
            { label: t.navBuilder, href: '/builder', trackActive: false },
            { label: t.clTitle, href: '/cover-letter', trackActive: false },
            ...links.slice(2)].map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{ ...linkStyle(isLinkActive(link.href, link.trackActive)), display: 'block', padding: '10px 14px' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
