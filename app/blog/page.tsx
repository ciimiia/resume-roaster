import Link from 'next/link'
import { POSTS } from '@/lib/posts'
import Logo from '@/components/ui/Logo'

export const metadata = {
  title: 'Blog — Resume Roaster',
  description: 'Resume tips, ATS strategies, and career advice from the Resume Roaster team.',
}

const TAG_COLORS: Record<string, string> = {
  ATS:        '#4D9FFF',
  Developers: '#FF4D4D',
  Remote:     '#4DCC88',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
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
        <Link href="/" style={{
          textDecoration: 'none', fontSize: 14, color: 'var(--ink-mute)',
          fontFamily: 'var(--font-body)', padding: '8px 14px',
          transition: 'color .2s',
        }}>← Back to home</Link>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px,6vw,80px) clamp(20px,5vw,60px)' }}>
        {/* Hero */}
        <div style={{ marginBottom: 56, animation: 'fadeUp .5s both' }}>
          <span style={{
            display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '.12em', color: 'var(--accent)', marginBottom: 14,
          }}>RESUME ROASTER · BLOG</span>
          <h1 style={{ fontSize: 'clamp(34px,5vw,60px)', fontWeight: 700, lineHeight: 1.05 }}>
            Career advice worth<br />
            <span style={{ background: 'linear-gradient(120deg,var(--accent),var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              actually reading.
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-soft)', marginTop: 18, maxWidth: 520, lineHeight: 1.6 }}>
            ATS strategy, resume writing, and how to land the job — no fluff.
          </p>
        </div>

        {/* Card grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {POSTS.map((post, i) => {
            const accent = TAG_COLORS[post.tag] ?? 'var(--accent)'
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article style={{
                  height: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
                  padding: 28,
                  display: 'flex', flexDirection: 'column', gap: 16,
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
                  {/* Tag */}
                  <span style={{
                    alignSelf: 'flex-start',
                    padding: '4px 11px', borderRadius: 999,
                    fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '.06em',
                    background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                    color: accent,
                  }}>{post.tag}</span>

                  {/* Title */}
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: 20, lineHeight: 1.25, color: 'var(--ink)',
                    flex: 1,
                  }}>{post.title}</h2>

                  {/* Excerpt */}
                  <p style={{ fontSize: 14.5, color: 'var(--ink-mute)', lineHeight: 1.6, margin: 0 }}>
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 16, borderTop: '1px solid var(--line)',
                    fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)',
                  }}>
                    <span>{formatDate(post.date)}</span>
                    <span>{post.readTime} min read</span>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '26px clamp(20px,5vw,60px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <Logo size={24} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
          © 2026 Resume Roaster · No resumes were truly harmed.
        </span>
      </footer>
    </div>
  )
}
