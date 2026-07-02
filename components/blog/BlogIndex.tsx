'use client'

import Link from 'next/link'
import type { Post } from '@/lib/posts'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useLang } from '@/lib/LangContext'
import { useSiteContent } from '@/lib/SiteContentContext'

const TAG_COLORS: Record<string, string> = {
  ATS:        '#4D9FFF',
  Developers: '#FF4D4D',
  Remote:     '#4DCC88',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex({ allPosts }: { allPosts: Post[] }) {
  const { t, lang } = useLang()
  const sc = useSiteContent()
  const s = (key: 'blogH1a' | 'blogH1b' | 'blogSubtitle', fallback: string) =>
    sc[key]?.[lang as 'en' | 'fa'] || fallback

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(20px,5vw,60px)',
        background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
        backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink-soft)' }}>Blog</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
          <Link href="/" style={{
            textDecoration: 'none', fontSize: 14, color: 'var(--ink-mute)',
            fontFamily: 'var(--font-body)', padding: '8px 14px',
            transition: 'color .2s',
          }}>{t.blogBackHome}</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px,6vw,80px) clamp(20px,5vw,60px)' }}>
        {/* Hero */}
        <div style={{ marginBottom: 56, animation: 'fadeUp .5s both' }}>
          <span style={{
            display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '.12em', color: 'var(--accent)', marginBottom: 14,
          }}>{t.blogEyebrow}</span>
          <h1 style={{ fontSize: 'clamp(34px,5vw,60px)', fontWeight: 700, lineHeight: 1.05 }}>
            {s('blogH1a', t.blogH1a)}<br />
            <span style={{ background: 'linear-gradient(120deg,var(--accent),var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {s('blogH1b', t.blogH1b)}
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-soft)', marginTop: 18, maxWidth: 520, lineHeight: 1.6 }}>
            {s('blogSubtitle', t.blogSubtitle)}
          </p>
        </div>

        {/* Card grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {allPosts.map((post, i) => {
            const accent = TAG_COLORS[post.tag] ?? 'var(--accent)'
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article style={{
                  height: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  transition: 'transform .25s cubic-bezier(.34,1.4,.64,1), border-color .2s, box-shadow .2s',
                  animation: `fadeUp .5s ${i * 0.08}s both`,
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(-4px)'
                    el.style.borderColor = accent
                    el.style.boxShadow = `0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px ${accent}22`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = ''
                    el.style.borderColor = 'var(--line)'
                    el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)'
                  }}
                >
                  {post.coverImage ? (
                    <div style={{
                      width: '100%', height: 180, overflow: 'hidden',
                      background: 'var(--surface-2)', flexShrink: 0, position: 'relative',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                        onError={e => {
                          const img = e.currentTarget
                          img.style.display = 'none'
                          const parent = img.parentElement
                          if (parent) {
                            parent.style.height = '8px'
                            parent.style.background = `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 60%, transparent))`
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '100%', height: 8, flexShrink: 0,
                      background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 60%, transparent))`,
                    }} />
                  )}

                  <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  <span style={{
                    alignSelf: 'flex-start',
                    padding: '4px 11px', borderRadius: 999,
                    fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '.06em',
                    background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                    color: accent,
                  }}>{post.tag}</span>

                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: 20, lineHeight: 1.25, color: 'var(--ink)',
                    flex: 1,
                  }}>{post.title}</h2>

                  <p style={{ fontSize: 14.5, color: 'var(--ink-mute)', lineHeight: 1.6, margin: 0 }}>
                    {post.excerpt}
                  </p>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 16, borderTop: '1px solid var(--line)',
                    fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)',
                  }}>
                    <span>{formatDate(post.date)}</span>
                    <span>{post.readTime} {t.blogMinRead}</span>
                  </div>
                  </div>{/* end inner padding div */}
                </article>
              </Link>
            )
          })}
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
