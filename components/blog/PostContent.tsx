'use client'

import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { useLang } from '@/lib/LangContext'
import type { Post, Block } from '@/lib/posts'

const TAG_COLORS: Record<string, string> = {
  ATS:        '#4D9FFF',
  Developers: '#FF4D4D',
  Remote:     '#4DCC88',
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function RenderBlock({ block }: { block: Block }) {
  const prose: React.CSSProperties = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-soft)', margin: 0 }

  switch (block.type) {
    case 'h2':
      return (
        <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', marginTop: 48, marginBottom: 16, lineHeight: 1.25 }}>
          {block.text}
        </h2>
      )
    case 'h3':
      return (
        <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginTop: 32, marginBottom: 12 }}>
          {block.text}
        </h3>
      )
    case 'p':
      return <p style={prose}>{block.text}</p>
    case 'ul':
      return (
        <ul style={{ ...prose, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {block.items?.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol style={{ ...prose, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, counterReset: 'ol-counter' }}>
          {block.items?.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                background: 'color-mix(in srgb, var(--accent) 16%, var(--surface-3))',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                color: 'var(--accent)',
              }}>{i + 1}</span>
              <span style={{ paddingTop: 3 }}>{item}</span>
            </li>
          ))}
        </ol>
      )
    case 'tip':
      return (
        <div style={{
          padding: '18px 22px', borderRadius: 'var(--r-md)',
          background: 'color-mix(in srgb, var(--accent) 8%, var(--surface-2))',
          border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          borderLeft: '3px solid var(--accent)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
          <p style={{ ...prose, fontSize: 15, margin: 0, color: 'var(--ink-soft)' }}>{block.text}</p>
        </div>
      )
    case 'quote':
      return (
        <blockquote style={{
          margin: 0, padding: '22px 28px',
          borderLeft: '3px solid var(--accent)',
          background: 'var(--surface-2)',
          borderRadius: '0 var(--r-md) var(--r-md) 0',
        }}>
          <p style={{ ...prose, fontSize: 18, fontStyle: 'italic', fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
            {block.text}
          </p>
        </blockquote>
      )
    default:
      return null
  }
}

export default function PostContent({ post, others }: { post: Post; others: Post[] }) {
  const { t, lang } = useLang()
  const accent = TAG_COLORS[post.tag] ?? 'var(--accent)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {post.coverImage && (
        <div style={{
          width: '100%', maxHeight: 420, overflow: 'hidden',
          background: 'var(--surface-2)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            style={{ width: '100%', height: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
          />
        </div>
      )}

      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,40px) 80px' }}>
        <div style={{ marginBottom: 40, animation: 'fadeUp .5s both' }}>
          <span style={{
            display: 'inline-block', padding: '5px 13px', borderRadius: 999, marginBottom: 20,
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '.06em',
            background: `color-mix(in srgb, ${accent} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
            color: accent,
          }}>{post.tag}</span>

          <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--ink)', marginBottom: 20 }}>
            {lang === 'fa' && post.titleFa ? post.titleFa : post.title}
          </h1>

          <p style={{ fontSize: 19, color: 'var(--ink-mute)', lineHeight: 1.6, marginBottom: 28 }}>
            {lang === 'fa' && post.excerptFa ? post.excerptFa : post.excerpt}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 28, borderBottom: '1px solid var(--line)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center',
              fontSize: 18, background: 'var(--surface-3)',
            }}>🔥</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{t.blogAuthor}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                {formatDate(post.date, lang)} · {post.readTime} {t.blogMinRead}
              </div>
            </div>
          </div>
        </div>

        <article style={{ display: 'flex', flexDirection: 'column', gap: 22, animation: 'fadeUp .6s .1s both' }}>
          {post.content.map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
        </article>

        {/* CTA */}
        <div style={{
          marginTop: 64, padding: 'clamp(28px,4vw,44px)', borderRadius: 'var(--r-lg)',
          background: 'linear-gradient(140deg, var(--surface-2), var(--surface))',
          border: '1px solid var(--line)', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(500px 200px at 50% 0%, var(--glow), transparent 70%)', pointerEvents: 'none' }} />
          <p style={{ position: 'relative', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(20px,3vw,28px)', marginBottom: 10 }}>
            {t.blogCTATitle}
          </p>
          <p style={{ position: 'relative', color: 'var(--ink-mute)', fontSize: 16, marginBottom: 24 }}>
            {t.blogCTABody}
          </p>
          <Link href="/" style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 26px', borderRadius: 'var(--r-md)', textDecoration: 'none',
            background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
            color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
            transition: 'opacity .2s',
          }}>
            {t.blogCTABtn}
          </Link>
        </div>

        {/* More posts */}
        {others.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <h3 style={{ fontSize: 20, marginBottom: 20, color: 'var(--ink)' }}>{t.blogMorePosts}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {others.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} style={{
                  textDecoration: 'none', padding: '18px 22px', borderRadius: 'var(--r-md)',
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                  transition: 'border-color .2s',
                }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--line)')}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>{lang === 'fa' && p.titleFa ? p.titleFa : p.title}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{p.readTime} {t.blogMinRead}</div>
                  </div>
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
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
