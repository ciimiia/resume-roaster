'use client'

import React, { useState, useEffect, useCallback, type CSSProperties } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useLang } from '@/lib/LangContext'
import { cardStyle } from '@/components/Landing'
import type { Post } from '@/lib/posts'
import type { SiteContent, LocaleString } from '@/lib/SiteContentContext'

type PostWithSource = Post & { source: 'static' | 'ai' }

interface StatsData {
  todayVisits: number
  weekVisits: number
  dailyTotals: { date: string; visits: number }[]
  topPages: { path: string; visits: number }[]
}

interface UserRow { email: string; createdAt: string }

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--ink-mute)', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
        transition: 'all .2s',
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? 'var(--accent-ink)' : 'var(--ink-mute)',
        boxShadow: active ? '0 2px 12px color-mix(in srgb, var(--accent) 30%, transparent)' : 'none',
      }}
    >{children}</button>
  )
}

/* ── Content tab ── */
function ContentTab({ posts }: { posts: PostWithSource[] }) {
  const { t } = useLang()
  const [list, setList] = useState(posts)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [genState, setGenState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [genSlug, setGenSlug] = useState('')
  const [genError, setGenError] = useState('')

  const deletePost = async (slug: string) => {
    setDeleting(slug)
    try {
      await fetch('/api/admin/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      setList(l => l.filter(p => p.slug !== slug))
    } finally {
      setDeleting(null)
    }
  }

  const generate = async () => {
    setGenState('loading')
    setGenError('')
    try {
      const res = await fetch('/api/admin/generate-post', { method: 'POST' })
      const data = await res.json() as { ok?: boolean; post?: { slug: string; title: string; date: string; tag: string }; error?: string }
      if (!res.ok || !data.ok) { setGenError(data.error ?? 'Failed'); setGenState('idle'); return }
      if (data.post) {
        setList(l => [{ ...data.post!, source: 'ai', excerpt: '', readTime: 6, content: [] }, ...l])
        setGenSlug(data.post.slug)
      }
      setGenState('done')
    } catch (e) {
      setGenError(String(e))
      setGenState('idle')
    }
  }

  return (
    <div>
      {/* Generate button */}
      <div style={{ ...cardStyle(), padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={generate}
          disabled={genState === 'loading'}
          style={{
            padding: '10px 20px', borderRadius: 'var(--r-md)',
            background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
            color: 'var(--accent-ink)', border: 'none',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            cursor: genState === 'loading' ? 'wait' : 'pointer',
            opacity: genState === 'loading' ? 0.7 : 1, transition: 'opacity .2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {genState === 'loading'
            ? <><span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />{t.adminGenerating}</>
            : `✨ ${t.adminGeneratePost}`}
        </button>
        {genState === 'done' && genSlug && (
          <Link href={`/blog/${genSlug}`} target="_blank" style={{
            fontSize: 13, color: 'var(--accent)', textDecoration: 'none',
            padding: '10px 16px', borderRadius: 'var(--r-md)',
            border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
          }}>{t.adminGenerated} {t.adminView}</Link>
        )}
        {genError && <span style={{ fontSize: 13, color: 'var(--roast)' }}>{genError}</span>}
      </div>

      {/* Posts table */}
      <div style={cardStyle({ overflow: 'hidden' })}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <Eyebrow>{t.adminPostsEyebrow}</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{t.adminPostsTitle}</h2>
        </div>
        {list.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 15 }}>{t.adminNoPosts}</div>
        ) : (
          <div>
            {list.map((p, i) => (
              <div key={p.slug} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 24px',
                borderBottom: i < list.length - 1 ? '1px solid var(--line)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--surface-2) 40%, transparent)',
              }}>
                {/* Source badge */}
                <span style={{
                  flexShrink: 0, padding: '3px 9px', borderRadius: 999,
                  fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '.06em',
                  background: p.source === 'ai'
                    ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                    : 'color-mix(in srgb, var(--ink-faint) 15%, transparent)',
                  color: p.source === 'ai' ? 'var(--accent)' : 'var(--ink-faint)',
                  border: `1px solid ${p.source === 'ai' ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line-2)'}`,
                }}>
                  {p.source === 'ai' ? t.adminSourceAI : t.adminSourceStatic}
                </span>

                {/* Title + date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {p.date} · {p.tag}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/blog/${p.slug}`} target="_blank" style={{
                    fontSize: 12, color: 'var(--ink-mute)', textDecoration: 'none',
                    padding: '6px 12px', borderRadius: 'var(--r-md)',
                    border: '1px solid var(--line-2)', background: 'var(--surface-2)',
                    fontFamily: 'var(--font-mono)',
                  }}>{t.adminView}</Link>
                  {p.source === 'ai' && (
                    <button
                      onClick={() => deletePost(p.slug)}
                      disabled={deleting === p.slug}
                      style={{
                        fontSize: 12, color: 'var(--roast)', cursor: 'pointer',
                        padding: '6px 12px', borderRadius: 'var(--r-md)',
                        border: '1px solid color-mix(in srgb, var(--roast) 30%, transparent)',
                        background: 'color-mix(in srgb, var(--roast) 8%, transparent)',
                        fontFamily: 'var(--font-mono)', transition: 'opacity .2s',
                        opacity: deleting === p.slug ? 0.5 : 1,
                      }}
                    >
                      {deleting === p.slug ? t.adminDeleting : t.adminDelete}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Stats tab ── */
function StatsTab() {
  const { t } = useLang()
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => setData(d as StatsData))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-mute)' }}>
      <span style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: t.adminToday, value: data?.todayVisits ?? 0 },
          { label: t.adminThisWeek, value: data?.weekVisits ?? 0 },
        ].map(stat => (
          <div key={stat.label} style={cardStyle({ padding: '24px 28px' })}>
            <Eyebrow>{t.adminStatsEyebrow}</Eyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 6 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Top pages */}
      <div style={cardStyle({ overflow: 'hidden' })}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <Eyebrow>{t.adminStatsEyebrow}</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{t.adminTopPages}</h2>
        </div>
        {!data?.topPages.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 15 }}>{t.adminNoStats}</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)' }}>{t.adminPageCol}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)' }}>{t.adminVisitsCol}</span>
            </div>
            {data.topPages.map((p, i) => (
              <div key={p.path} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', padding: '14px 24px',
                borderBottom: i < data.topPages.length - 1 ? '1px solid var(--line)' : 'none',
                alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-soft)' }}>{p.path}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{p.visits}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Daily breakdown */}
      <div style={cardStyle({ overflow: 'hidden' })}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <Eyebrow>{t.adminStatsEyebrow}</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Last 7 Days</h2>
        </div>
        {data?.dailyTotals.map((d, i) => {
          const max = Math.max(...(data.dailyTotals.map(x => x.visits)), 1)
          return (
            <div key={d.date} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 48px', gap: 16, alignItems: 'center',
              padding: '12px 24px',
              borderBottom: i < (data.dailyTotals.length - 1) ? '1px solid var(--line)' : 'none',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>{d.date}</span>
              <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(d.visits / max) * 100}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width .4s' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textAlign: 'right' }}>{d.visits}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Users tab ── */
function UsersTab() {
  const { t } = useLang()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => setUsers((d as { users: UserRow[] }).users ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <span style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
    </div>
  )

  return (
    <div style={cardStyle({ overflow: 'hidden' })}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
        <Eyebrow>{t.adminUsersEyebrow}</Eyebrow>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{t.adminUsersTitle}</h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)', marginTop: 4, display: 'block' }}>
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </span>
      </div>
      {users.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 15 }}>{t.adminNoUsers}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)' }}>{t.adminUserEmail}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)' }}>{t.adminUserJoined}</span>
          </div>
          {users.map((u, i) => (
            <div key={u.email} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', padding: '14px 24px',
              borderBottom: i < users.length - 1 ? '1px solid var(--line)' : 'none',
              alignItems: 'center',
              background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--surface-2) 40%, transparent)',
            }}>
              <span style={{ fontSize: 14, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>{u.email}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                {new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// i18n defaults used as placeholders in the form
type SCKey = keyof SiteContent

interface SCSection {
  labelKey: 'adminSCSectionLanding' | 'adminSCSectionCL' | 'adminSCSectionBuilder' | 'adminSCSectionBlog' | 'adminSCSectionFooter'
  fields: SCKey[]
  textareas?: SCKey[]
}

const SECTIONS: SCSection[] = [
  {
    labelKey: 'adminSCSectionLanding',
    fields: ['heroH1a','heroH1b','heroH1c','heroBody','heroCta1','heroCta2','ctaH2','ctaBody'],
    textareas: ['heroBody','ctaBody'],
  },
  {
    labelKey: 'adminSCSectionCL',
    fields: ['clTitle','clSubtitle'],
    textareas: ['clSubtitle'],
  },
  {
    labelKey: 'adminSCSectionBuilder',
    fields: ['builderTitle','builderSubtitle'],
    textareas: ['builderSubtitle'],
  },
  {
    labelKey: 'adminSCSectionBlog',
    fields: ['blogH1a','blogH1b','blogSubtitle'],
    textareas: ['blogSubtitle'],
  },
  {
    labelKey: 'adminSCSectionFooter',
    fields: ['footerTagline'],
    textareas: [],
  },
]

/* ── Site Content tab ── */
function SiteContentTab() {
  const { t } = useLang()
  const [content, setContent] = useState<SiteContent>({})
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'>('idle')
  const [resetState, setResetState] = useState<'idle'|'resetting'>('idle')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ adminSCSectionLanding: true })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/site-content')
    const data = await res.json() as { content: SiteContent }
    setContent(data.content ?? {})
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setField = (key: SCKey, lang: 'en'|'fa', value: string) => {
    setContent(prev => ({
      ...prev,
      [key]: { ...(prev[key] as LocaleString | undefined), [lang]: value },
    }))
  }

  const save = async () => {
    setSaveState('saving')
    await fetch('/api/admin/site-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2500)
  }

  const reset = async () => {
    setResetState('resetting')
    await fetch('/api/admin/site-content', { method: 'DELETE' })
    setContent({})
    setResetState('idle')
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)',
    background: 'var(--surface-2)', border: '1px solid var(--line-2)',
    color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 14,
    outline: 'none', resize: 'vertical', transition: 'border-color .2s',
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <span style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header with save/reset */}
      <div style={cardStyle({ overflow: 'hidden' })}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Eyebrow>{t.adminSiteContentEyebrow}</Eyebrow>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{t.adminSiteContentTitle}</h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={reset}
              disabled={resetState === 'resetting'}
              style={{
                padding: '8px 16px', borderRadius: 'var(--r-md)',
                border: '1px solid var(--line-2)', background: 'var(--surface-2)',
                color: 'var(--ink-mute)', fontFamily: 'var(--font-body)', fontSize: 13,
                cursor: 'pointer', transition: 'opacity .2s', opacity: resetState === 'resetting' ? 0.5 : 1,
              }}
            >
              {resetState === 'resetting' ? t.adminSiteContentResetting : t.adminSiteContentReset}
            </button>
            <button
              onClick={save}
              disabled={saveState !== 'idle'}
              style={{
                padding: '8px 20px', borderRadius: 'var(--r-md)',
                background: saveState === 'saved'
                  ? '#4DCC88'
                  : 'linear-gradient(140deg, var(--accent), var(--accent-2))',
                color: saveState === 'saved' ? '#fff' : 'var(--accent-ink)',
                border: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                cursor: saveState !== 'idle' ? 'default' : 'pointer',
                transition: 'opacity .2s, background .3s', opacity: saveState === 'saving' ? 0.7 : 1,
              }}
            >
              {saveState === 'saving' ? t.adminSiteContentSaving : saveState === 'saved' ? `✓ ${t.adminSiteContentSaved}` : t.adminSiteContentSave}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible sections */}
      {SECTIONS.map(section => {
        const isOpen = !!openSections[section.labelKey]
        const sectionLabel = t[section.labelKey] ?? section.labelKey
        return (
          <div key={section.labelKey} style={cardStyle({ overflow: 'hidden' })}>
            <button
              onClick={() => setOpenSections(prev => ({ ...prev, [section.labelKey]: !prev[section.labelKey] }))}
              style={{
                width: '100%', padding: '16px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', borderBottom: isOpen ? '1px solid var(--line)' : 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                {sectionLabel}
              </span>
              <span style={{ color: 'var(--ink-mute)', fontSize: 18, lineHeight: 1, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                ▾
              </span>
            </button>

            {isOpen && (
              <div style={{ padding: '24px' }}>
                {section.fields.map((key, i) => {
                  const label = t.adminSiteContentFields[key] ?? key
                  const enVal = (content[key] as LocaleString | undefined)?.en ?? ''
                  const faVal = (content[key] as LocaleString | undefined)?.fa ?? ''
                  const isTextarea = section.textareas?.includes(key) ?? false
                  return (
                    <div key={key} style={{ marginBottom: i < section.fields.length - 1 ? 28 : 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--ink-mute)', marginBottom: 10 }}>
                        {label.toUpperCase()}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                            {t.adminSiteContentEnLabel}
                          </div>
                          {isTextarea ? (
                            <textarea
                              rows={3}
                              value={enVal}
                              onChange={e => setField(key, 'en', e.target.value)}
                              style={inp}
                              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                            />
                          ) : (
                            <input
                              type="text"
                              value={enVal}
                              onChange={e => setField(key, 'en', e.target.value)}
                              style={inp}
                              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                            />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                            {t.adminSiteContentFaLabel}
                          </div>
                          {isTextarea ? (
                            <textarea
                              rows={3}
                              value={faVal}
                              onChange={e => setField(key, 'fa', e.target.value)}
                              style={{ ...inp, direction: 'rtl', fontFamily: 'inherit' }}
                              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                            />
                          ) : (
                            <input
                              type="text"
                              value={faVal}
                              onChange={e => setField(key, 'fa', e.target.value)}
                              style={{ ...inp, direction: 'rtl', fontFamily: 'inherit' }}
                              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                            />
                          )}
                        </div>
                      </div>
                      {i < section.fields.length - 1 && (
                        <div style={{ height: 1, background: 'var(--line)', marginTop: 28 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Main ── */
export default function AdminClient({ email, posts }: { email: string; posts: PostWithSource[] }) {
  const { t } = useLang()
  const [tab, setTab] = useState<'content' | 'stats' | 'users' | 'site'>('content')

  return (
    <div style={{ minHeight: '100vh', padding: '0 clamp(20px, 5vw, 60px) 100px' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0',
        background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--line)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <Link href="/dashboard" style={{
            fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none',
            padding: '7px 14px', borderRadius: 'var(--r-md)',
            border: '1px solid var(--line-2)', background: 'var(--surface-2)',
          }}>Dashboard</Link>
          <span style={{
            fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0 }} />
            {email}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        {/* Page hero */}
        <div style={{ padding: '48px 0 36px' }}>
          <Eyebrow>{t.adminEyebrow}</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.1 }}>
            {t.adminTitle}
          </h1>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, padding: '4px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--line)', width: 'fit-content' }}>
          <TabButton active={tab === 'content'} onClick={() => setTab('content')}>{t.adminTabContent}</TabButton>
          <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>{t.adminTabStats}</TabButton>
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>{t.adminTabUsers}</TabButton>
          <TabButton active={tab === 'site'} onClick={() => setTab('site')}>{t.adminTabSiteContent}</TabButton>
        </div>

        {/* Tab content */}
        {tab === 'content' && <ContentTab posts={posts} />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'site' && <SiteContentTab />}
      </div>
    </div>
  )
}
