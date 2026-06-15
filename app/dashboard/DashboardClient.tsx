'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { useSession } from '@/lib/SessionContext'
import Logo from '@/components/ui/Logo'
import Icon from '@/components/ui/Icon'
import { cardStyle } from '@/components/Landing'
import type { AnalysisSummary } from '@/app/api/save/route'
import type { CoverLetterSummary } from '@/app/api/cover-letter/route'

interface Props {
  email: string
  analyses: AnalysisSummary[]
  coverLetters: CoverLetterSummary[]
  isAdmin?: boolean
}

// Colour per analysis grade
const gradeColor: Record<string, string> = {
  'A+': '#4DCC88', A: '#4DCC88', 'A-': '#4DCC88',
  'B+': '#4D9FFF', B: '#4D9FFF', 'B-': '#4D9FFF',
  'C+': '#FF8A3D', C: '#FF8A3D', 'C-': '#FF8A3D',
  D: '#FF4D4D', F: '#FF4D4D',
}

function gradeAccent(grade: string) {
  return gradeColor[grade] ?? 'var(--ink-mute)'
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
      color: 'var(--ink-mute)', marginBottom: 10,
    }}>{children}</div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--line)', margin: '52px 0' }} />
}

/* ── Empty state card ── */
function EmptyCard({ icon, message, ctaLabel, ctaHref }: {
  icon: string; message: string; ctaLabel: string; ctaHref: string
}) {
  return (
    <div style={cardStyle({
      padding: '48px 32px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', textAlign: 'center', gap: 16,
    })}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--surface-2)', border: '1px solid var(--line-2)',
        display: 'grid', placeItems: 'center', fontSize: 24,
      }}>{icon}</div>
      <p style={{ color: 'var(--ink-mute)', fontSize: 15, lineHeight: 1.6, maxWidth: 320 }}>{message}</p>
      <Link href={ctaHref} style={{
        marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 22px', borderRadius: 'var(--r-md)',
        background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
        color: 'var(--accent-ink)', fontFamily: 'var(--font-display)',
        fontWeight: 700, fontSize: 14, textDecoration: 'none',
      }}>
        <Icon name="upload" size={14} /> {ctaLabel}
      </Link>
    </div>
  )
}

/* ── Analysis card ── */
function AnalysisCard({ a, viewLabel }: { a: AnalysisSummary; viewLabel: string }) {
  const accent = gradeAccent(a.grade)
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle(),
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 20,
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'transform .2s, box-shadow .2s',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent)`
          : undefined,
      }}
    >
      {/* Score bubble */}
      <div style={{
        flexShrink: 0, width: 56, height: 56, borderRadius: '50%',
        background: `color-mix(in srgb, ${accent} 14%, var(--surface-2))`,
        border: `2px solid color-mix(in srgb, ${accent} 60%, transparent)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, lineHeight: 1, color: accent }}>{a.score}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: accent, letterSpacing: '.05em', marginTop: 1 }}>{a.grade}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.verdict}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '.04em' }}>
            {a.mode.toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
            {new Date(a.savedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* CTA */}
      <Link href={`/r/${a.id}`} style={{
        flexShrink: 0, fontSize: 13, fontWeight: 600,
        color: accent, textDecoration: 'none',
        padding: '8px 16px', borderRadius: 'var(--r-md)',
        border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
        background: `color-mix(in srgb, ${accent} 8%, transparent)`,
        transition: 'background .2s',
      }}>{viewLabel}</Link>
    </div>
  )
}

/* ── Cover letter card ── */
function CoverLetterCard({ cl, savedLabel }: { cl: CoverLetterSummary; savedLabel: string }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle(),
        padding: '20px 24px',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'transform .2s, box-shadow .2s',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,.5)' : undefined,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Subtle gradient accent */}
      <div style={{
        position: 'absolute', inset: 0, opacity: hovered ? 1 : 0, pointerEvents: 'none',
        background: 'radial-gradient(400px 200px at 100% 0%, color-mix(in srgb, var(--coach) 6%, transparent), transparent)',
        transition: 'opacity .3s',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{
          fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7,
          marginBottom: 12, display: '-webkit-box',
          WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {cl.preview}…
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '.04em' }}>
          {savedLabel} · {new Date(cl.savedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

/* ── Generate Post Button ── */
function GeneratePostButton() {
  const { t } = useLang()
  const [state, setState] = React.useState<'idle' | 'loading' | 'done'>('idle')
  const [slug, setSlug] = React.useState('')
  const [error, setError] = React.useState('')

  const generate = async () => {
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/admin/generate-post', { method: 'POST' })
      const data = await res.json() as { ok?: boolean; post?: { slug: string }; error?: string }
      if (!res.ok || !data.ok) { setError(data.error ?? 'Failed'); setState('idle'); return }
      setSlug(data.post?.slug ?? '')
      setState('done')
    } catch (e) {
      setError(String(e))
      setState('idle')
    }
  }

  return (
    <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px dashed var(--line-2)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)', marginBottom: 12 }}>
        ADMIN · BLOG
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          onClick={generate}
          disabled={state === 'loading'}
          style={{
            padding: '10px 20px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)',
            background: 'var(--surface-2)', color: 'var(--ink-mute)',
            fontFamily: 'var(--font-body)', fontSize: 14, cursor: state === 'loading' ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: state === 'loading' ? 0.6 : 1, transition: 'opacity .2s',
          }}
        >
          {state === 'loading'
            ? <><span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> {t.dashboardGenerating}</>
            : `✨ ${t.dashboardGeneratePost}`}
        </button>

        {state === 'done' && slug && (
          <Link href={`/blog/${slug}`} style={{
            fontSize: 14, color: 'var(--accent)', textDecoration: 'none',
            padding: '10px 18px', borderRadius: 'var(--r-md)',
            border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
          }}>
            {t.dashboardGenerateSuccess} {t.dashboardGenerateView}
          </Link>
        )}

        {error && (
          <span style={{ fontSize: 13, color: 'var(--roast)' }}>{error}</span>
        )}
      </div>
    </div>
  )
}

/* ── Main component ── */
import React from 'react'

export default function DashboardClient({ email, analyses, coverLetters, isAdmin }: Props) {
  const { t } = useLang()
  const { refresh } = useSession()
  const router = useRouter()

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    await refresh()
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 clamp(20px, 5vw, 60px) 100px' }}>

      {/* ── Sticky header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0',
        background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--line)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '.04em',
            color: 'var(--ink-faint)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#4DCC88',
              boxShadow: '0 0 6px #4DCC88', flexShrink: 0,
            }} />
            {email}
          </span>
          <button onClick={signOut} style={{
            background: 'var(--surface-2)', border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-md)', padding: '7px 14px',
            color: 'var(--ink-mute)', fontFamily: 'var(--font-body)', fontSize: 13,
            cursor: 'pointer', transition: 'color .2s, border-color .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--line)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}
          >{t.signOut}</button>
        </div>
      </header>

      {/* ── Hero section ── */}
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ padding: '56px 0 52px' }}>
          <Eyebrow>{t.dashboardEyebrow}</Eyebrow>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.1, marginBottom: 12,
          }}>
            {t.dashboardTitle}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-mute)', lineHeight: 1.6 }}>
            {t.dashboardWelcome}
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div style={{
          display: 'flex', gap: 1, marginBottom: 60,
          borderRadius: 'var(--r-lg)', overflow: 'hidden',
          border: '1px solid var(--line)',
        }}>
          {[
            { label: t.dashboardAnalysesEyebrow, value: analyses.length },
            { label: t.dashboardCLEyebrow, value: coverLetters.length },
            { label: t.dashboardScore,
              value: analyses.length
                ? Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length)
                : '—' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1, padding: '20px 24px',
              background: 'var(--surface)',
              borderRight: i < 2 ? '1px solid var(--line)' : 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)', marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Analyses ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <Eyebrow>{t.dashboardAnalysesEyebrow}</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
                {t.dashboardAnalyses}
              </h2>
            </div>
            {analyses.length > 0 && (
              <Link href="/" style={{
                fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Icon name="upload" size={13} /> {t.dashboardRoastCta}
              </Link>
            )}
          </div>

          {analyses.length === 0
            ? <EmptyCard
                icon="🔥"
                message={t.dashboardNoAnalyses}
                ctaLabel={t.dashboardRoastCta}
                ctaHref="/"
              />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analyses.map(a => (
                  <AnalysisCard key={a.id} a={a} viewLabel={t.dashboardViewResult} />
                ))}
              </div>
            )}
        </section>

        <Divider />

        {/* ── Cover Letters ── */}

        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <Eyebrow>{t.dashboardCLEyebrow}</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
                {t.dashboardCoverLetters}
              </h2>
            </div>
            {coverLetters.length > 0 && (
              <Link href="/cover-letter" style={{
                fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                + {t.dashboardCLCta}
              </Link>
            )}
          </div>

          {coverLetters.length === 0
            ? <EmptyCard
                icon="✉️"
                message={t.dashboardNoCoverLetters}
                ctaLabel={t.dashboardCLCta}
                ctaHref="/cover-letter"
              />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {coverLetters.map(cl => (
                  <CoverLetterCard key={cl.id} cl={cl} savedLabel={t.dashboardSaved} />
                ))}
              </div>
            )}
        </section>

        {isAdmin && <GeneratePostButton />}
      </div>
    </div>
  )
}
