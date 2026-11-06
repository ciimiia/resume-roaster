'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/LangContext'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'
import { cardStyle, containerStyle } from '@/lib/styles'

interface JobMatchItem {
  id: string
  source: string
  company: string
  title: string
  location: string | null
  remoteType: string | null
  applyUrl: string
  sourceUrl: string
  attributionLabel: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPredicted: boolean
  postedAt: string | null
  matchScore: number
  strengths: string[]
  gaps: string[]
  missingKeywords: string[]
  recommendation: string
  saved: boolean
}

type MatchesResponse =
  | { needsApproval: true }
  | { needsApproval: false; items: JobMatchItem[]; rerankCapped: boolean }
  | { error: string }

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--ink-mute)', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 75) return '#4DCC88'
  if (score >= 50) return '#4D9FFF'
  return '#FF8A3D'
}

function salaryLine(job: JobMatchItem): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null
  const range = job.salaryMin != null && job.salaryMax != null
    ? `${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`
    : (job.salaryMin ?? job.salaryMax)!.toLocaleString()
  return `${job.salaryCurrency ?? ''} ${range}`.trim()
}

function JobCard({ job, onSave, onHide, t }: {
  job: JobMatchItem
  onSave: (id: string, saved: boolean) => void
  onHide: (id: string) => void
  t: ReturnType<typeof useLang>['t']
}) {
  const [expanded, setExpanded] = useState(false)
  const accent = scoreColor(job.matchScore)
  const salary = salaryLine(job)

  return (
    <div style={cardStyle({ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 })}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{
          flexShrink: 0, width: 56, height: 56, borderRadius: '50%',
          background: `color-mix(in srgb, ${accent} 14%, var(--surface-2))`,
          border: `2px solid color-mix(in srgb, ${accent} 60%, transparent)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: accent }}>{job.matchScore}</div>
          <div style={{ fontSize: 9, color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)' }}>{t.jobsScoreLabel}</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{job.title}</div>
          <div style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 2 }}>
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
            {job.remoteType ? ` · ${job.remoteType}` : ''}
          </div>
          {salary && <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 4 }}>
            {salary}{job.salaryPredicted ? ` (${t.jobsSalaryPredicted})` : ''}
          </div>}
          {job.attributionLabel && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6 }}>
              {t.jobsViaSource.replace('{source}', job.attributionLabel)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <Button variant="outline" size="sm" icon="link" onClick={() => window.open(job.applyUrl, '_blank', 'noopener,noreferrer')}>
            {t.jobsApplyBtn}
          </Button>
          <Button variant={job.saved ? 'ghost' : 'quiet'} size="sm" icon="star" onClick={() => onSave(job.id, !job.saved)}>
            {job.saved ? t.jobsSavedBtn : t.jobsSaveBtn}
          </Button>
          <Button variant="quiet" size="sm" icon="x" onClick={() => onHide(job.id)}>
            {t.jobsHideBtn}
          </Button>
        </div>
      </div>

      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0,
        }}
      >
        <Icon name="spark" size={14} /> {t.jobsWhyMatch} {expanded ? '▲' : '▼'}
      </button>

      {expanded && (
        <div style={{ display: 'grid', gap: 10, paddingTop: 4, borderTop: '1px solid var(--line)', fontSize: 13.5 }}>
          {job.strengths.length > 0 && (
            <div><strong style={{ color: 'var(--ink)' }}>{t.jobsStrengths}:</strong> {job.strengths.join(' · ')}</div>
          )}
          {job.gaps.length > 0 && (
            <div><strong style={{ color: 'var(--ink)' }}>{t.jobsGaps}:</strong> {job.gaps.join(' · ')}</div>
          )}
          {job.missingKeywords.length > 0 && (
            <div><strong style={{ color: 'var(--ink)' }}>{t.jobsMissingKeywords}:</strong> {job.missingKeywords.join(', ')}</div>
          )}
          {job.recommendation && (
            <div><strong style={{ color: 'var(--ink)' }}>{t.jobsRecommendation}:</strong> {job.recommendation}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JobsClient() {
  const { t } = useLang()
  const [state, setState] = useState<'loading' | 'needsApproval' | 'error' | 'ready'>('loading')
  const [items, setItems] = useState<JobMatchItem[]>([])
  const [rerankCapped, setRerankCapped] = useState(false)
  const [remoteFilter, setRemoteFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [sort, setSort] = useState<'match' | 'newest'>('match')
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    fetch('/api/jobs/matches')
      .then(r => r.json() as Promise<MatchesResponse>)
      .then(data => {
        if (cancelled) return
        if ('error' in data) { setState('error'); return }
        if (data.needsApproval) { setState('needsApproval'); return }
        setItems(data.items)
        setRerankCapped(data.rerankCapped)
        setState('ready')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    let list = items.filter(j => !hiddenIds.has(j.id))
    if (remoteFilter) list = list.filter(j => j.remoteType === remoteFilter)
    if (countryFilter.trim()) {
      const q = countryFilter.trim().toLowerCase()
      list = list.filter(j => (j.location ?? '').toLowerCase().includes(q))
    }
    list = [...list].sort((a, b) => sort === 'match'
      ? b.matchScore - a.matchScore
      : (new Date(b.postedAt ?? 0).getTime() - new Date(a.postedAt ?? 0).getTime()))
    return list
  }, [items, hiddenIds, remoteFilter, countryFilter, sort])

  async function handleSave(id: string, saved: boolean) {
    setItems(prev => prev.map(j => j.id === id ? { ...j, saved } : j))
    await fetch(`/api/jobs/${id}/save`, { method: saved ? 'POST' : 'DELETE' }).catch(() => {})
  }

  async function handleHide(id: string) {
    setHiddenIds(prev => new Set(prev).add(id))
    await fetch(`/api/jobs/${id}/hide`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 var(--gutter) 100px' }}>
      <div style={containerStyle(860)}>
        <div style={{ padding: 'var(--sp-9) 0 var(--sp-7)' }}>
          <Eyebrow>{t.jobsEyebrow}</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-2xl)', lineHeight: 1.1, marginBottom: 'var(--sp-3)' }}>
            {t.jobsTitle}
          </h1>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--ink-mute)', lineHeight: 1.6 }}>{t.jobsDesc}</p>
        </div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-mute)' }}>{t.jobsLoading}</div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-mute)' }}>{t.jobsErrorLoad}</div>
        )}

        {state === 'needsApproval' && (
          <div style={cardStyle({ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 })}>
            <p style={{ color: 'var(--ink-mute)', fontSize: 15, lineHeight: 1.6, maxWidth: 360 }}>{t.jobsNeedsApprovalMsg}</p>
            <Link href="/profile" style={{ textDecoration: 'none' }}>
              <Button icon="doc">{t.jobsNeedsApprovalCta}</Button>
            </Link>
          </div>
        )}

        {state === 'ready' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
              <select value={remoteFilter} onChange={e => setRemoteFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13.5 }}>
                <option value="">{t.jobsFilterRemoteAll}</option>
                <option value="remote">{t.prefsRemote}</option>
                <option value="hybrid">{t.prefsHybrid}</option>
                <option value="onsite">{t.prefsOnsite}</option>
              </select>
              <input value={countryFilter} onChange={e => setCountryFilter(e.target.value)} placeholder={t.jobsFilterCountryPlaceholder}
                style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13.5 }} />
              <select value={sort} onChange={e => setSort(e.target.value as 'match' | 'newest')}
                style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13.5 }}>
                <option value="match">{t.jobsSortMatch}</option>
                <option value="newest">{t.jobsSortNewest}</option>
              </select>
            </div>

            {rerankCapped && (
              <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 'var(--sp-5)', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                {t.jobsRerankCapped}
              </div>
            )}

            {visible.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-mute)' }}>{t.jobsEmpty}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {visible.map(job => (
                  <JobCard key={job.id} job={job} onSave={handleSave} onHide={handleHide} t={t} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
