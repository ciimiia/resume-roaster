'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/LangContext'
import Button from '@/components/ui/Button'
import { cardStyle, containerStyle } from '@/lib/styles'

interface TailoredExperience { company: string; title: string; bullets: string[] }
interface TailoredProfile { summary: string; experience: TailoredExperience[]; skills: string[]; keywordsToEmphasize: string[] }
interface ChangeItem { field: string; reason: string }
interface FabricationFlag { category: string; location: string; value: string; message: string }
interface AtsCoverage { matchedKeywords: string[]; missingKeywords: string[]; formattingWarnings: string[] }
interface TailoredResume {
  id: string
  jobTitleSnapshot: string
  companySnapshot: string | null
  tailoredProfile: TailoredProfile
  changes: ChangeItem[]
  flags: FabricationFlag[]
  atsCoverage: AtsCoverage
}

interface OriginalProfile { summary: string; experience: { company: string; title: string; bullets: string[] }[]; skills: string[] }

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--ink-mute)', marginBottom: 10 }}>{children}</div>
}

export default function TailorClient() {
  const { t } = useLang()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId') ?? undefined
  const viewId = searchParams.get('view') ?? undefined

  const [needsApproval, setNeedsApproval] = useState(false)
  const [original, setOriginal] = useState<OriginalProfile | null>(null)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TailoredResume | null>(null)
  const [template, setTemplate] = useState<'modern' | 'classic'>('modern')
  const [coverLetter, setCoverLetter] = useState<{ id: string; letter: string } | null>(null)
  const [coverLetterRunning, setCoverLetterRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [resumePdfLoading, setResumePdfLoading] = useState(false)
  const [resumePdfError, setResumePdfError] = useState('')
  const [coverLetterPdfLoading, setCoverLetterPdfLoading] = useState(false)
  const [coverLetterPdfError, setCoverLetterPdfError] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (!d.profile || !d.profile.approved) { setNeedsApproval(true); return }
      setOriginal({ summary: d.profile.summary, experience: d.profile.experience, skills: d.profile.skills })
    }).catch(() => setNeedsApproval(true))
  }, [])

  useEffect(() => {
    if (!viewId) return
    fetch(`/api/tailor/${viewId}`).then(r => r.json()).then(d => {
      if (d.tailoredResume) setResult(d.tailoredResume)
    })
  }, [viewId])

  const runTailor = async () => {
    setRunning(true)
    setError('')
    try {
      const body = jobId ? { jobId } : { jobText: pasteText }
      const res = await fetch('/api/tailor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (res.status === 429) { setError(t.tailorRateLimited); return }
      if (res.status === 409) { setNeedsApproval(true); return }
      if (res.status === 400 && data.error === 'JOB_TEXT_TOO_SHORT') { setError(t.tailorJobTextTooShort); return }
      if (!res.ok) { setError(t.apiError); return }
      setResult(data.tailoredResume)
    } catch {
      setError(t.apiError)
    } finally {
      setRunning(false)
    }
  }

  const generateCoverLetter = async () => {
    if (!result) return
    setCoverLetterRunning(true)
    try {
      const res = await fetch(`/api/tailor/${result.id}/cover-letter`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setCoverLetter({ id: data.id, letter: data.letter })
    } finally {
      setCoverLetterRunning(false)
    }
  }

  const copyLetter = async () => {
    if (!coverLetter) return
    await navigator.clipboard.writeText(coverLetter.letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /** fetch + blob download instead of a plain <a href> — so a 429/500 can show a friendly message instead of the browser opening a raw JSON error page. */
  const downloadPdf = async (url: string, filename: string, setLoading: (v: boolean) => void, setErr: (v: string) => void) => {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(url)
      if (res.status === 429) { setErr(t.tailorPdfRateLimited); return }
      if (!res.ok) { setErr(t.tailorPdfError); return }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      setErr(t.tailorPdfError)
    } finally {
      setLoading(false)
    }
  }

  const downloadResumePdf = () => downloadPdf(`/api/tailor/${result!.id}/pdf?template=${template}`, `resume-${template}.pdf`, setResumePdfLoading, setResumePdfError)
  const downloadCoverLetterPdf = () => downloadPdf(`/api/cover-letter/${coverLetter!.id}/pdf`, 'cover-letter.pdf', setCoverLetterPdfLoading, setCoverLetterPdfError)

  return (
    <div style={{ minHeight: '100vh', padding: '0 var(--gutter) 100px' }}>
      <div style={containerStyle(900)}>
        <div style={{ padding: 'var(--sp-9) 0 var(--sp-7)' }}>
          <Eyebrow>{t.tailorEyebrow}</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-2xl)', marginBottom: 'var(--sp-3)' }}>{t.tailorPageTitle}</h1>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--ink-mute)', lineHeight: 1.6 }}>{t.tailorPageDesc}</p>
        </div>

        {needsApproval && (
          <div style={cardStyle({ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 })}>
            <p style={{ color: 'var(--ink-mute)', fontSize: 15, maxWidth: 360 }}>{t.tailorNeedsApprovalMsg}</p>
            <Link href="/profile" style={{ textDecoration: 'none' }}><Button icon="doc">{t.tailorNeedsApprovalCta}</Button></Link>
          </div>
        )}

        {!needsApproval && !result && (
          <div style={cardStyle({ padding: '24px' })}>
            {!jobId && (
              <>
                <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 8 }}>{t.tailorPasteLabel}</div>
                <input value={pasteTitle} onChange={e => setPasteTitle(e.target.value)} placeholder={t.tailorPasteTitlePlaceholder}
                  style={{ width: '100%', padding: '10px 14px', marginBottom: 10, borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)' }} />
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder={t.tailorPastePlaceholder} rows={10}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)', fontFamily: 'inherit', resize: 'vertical' }} />
              </>
            )}
            {error && <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: 12 }}>{error}</div>}
            <div style={{ marginTop: 16 }}>
              <Button onClick={runTailor} disabled={running || (!jobId && pasteText.trim().length < 40)} icon="bolt">
                {running ? t.tailorRunning : t.tailorSubmitBtn}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <>
            <div style={cardStyle({ padding: '20px 24px', marginBottom: 16 })}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{result.jobTitleSnapshot}{result.companySnapshot ? ` · ${result.companySnapshot}` : ''}</div>
            </div>

            {result.flags.length > 0 ? (
              <div style={cardStyle({ padding: '16px 20px', marginBottom: 16, border: '1px solid var(--danger)' })}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--danger)', marginBottom: 8 }}>{t.tailorFlagsTitle}</div>
                {result.flags.map((f, i) => (
                  <div key={i} style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>{f.location}:</strong> {f.message}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--secondary)', marginBottom: 16 }}>{t.tailorFlagsNone}</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {original && (
                <div style={cardStyle({ padding: '18px' })}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{t.tailorOriginalLabel}</div>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>{original.summary}</p>
                </div>
              )}
              <div style={cardStyle({ padding: '18px' })}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{t.tailorTailoredLabel}</div>
                <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>{result.tailoredProfile.summary}</p>
              </div>
            </div>

            {result.changes.length > 0 && (
              <div style={cardStyle({ padding: '18px', marginBottom: 16 })}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{t.tailorChangesTitle}</div>
                {result.changes.map((c, i) => (
                  <div key={i} style={{ fontSize: 12.5, marginBottom: 4 }}><strong>{c.field}:</strong> {c.reason}</div>
                ))}
              </div>
            )}

            <div style={cardStyle({ padding: '18px', marginBottom: 16 })}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{t.tailorAtsTitle}</div>
              <div style={{ fontSize: 12.5, marginBottom: 4 }}><strong>{t.tailorAtsMatched}:</strong> {result.atsCoverage.matchedKeywords.join(', ') || '—'}</div>
              <div style={{ fontSize: 12.5, marginBottom: 4 }}><strong>{t.tailorAtsMissing}:</strong> {result.atsCoverage.missingKeywords.join(', ') || '—'}</div>
              {result.atsCoverage.formattingWarnings.length > 0 && (
                <div style={{ fontSize: 12.5 }}><strong>{t.tailorAtsFormatting}:</strong> {result.atsCoverage.formattingWarnings.join(' · ')}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <select value={template} onChange={e => setTemplate(e.target.value as 'modern' | 'classic')}
                style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)' }}>
                <option value="modern">{t.tailorTemplateModern}</option>
                <option value="classic">{t.tailorTemplateClassic}</option>
              </select>
              <Button icon="download" size="sm" onClick={downloadResumePdf} disabled={resumePdfLoading}>
                {resumePdfLoading ? t.tailorPdfPreparing : t.tailorDownloadPdfBtn}
              </Button>
              <Button variant="ghost" size="sm" icon="doc" onClick={generateCoverLetter} disabled={coverLetterRunning}>
                {coverLetterRunning ? t.tailorCoverLetterRunning : t.tailorCoverLetterBtn}
              </Button>
            </div>
            {resumePdfError && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: -8, marginBottom: 16 }}>{resumePdfError}</div>}

            {coverLetter && (
              <div style={cardStyle({ padding: '18px' })}>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{coverLetter.letter}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <Button variant="ghost" size="sm" icon="link" onClick={copyLetter}>{copied ? t.tailorCoverLetterCopied : t.tailorCoverLetterCopyBtn}</Button>
                  <Button variant="ghost" size="sm" icon="download" onClick={downloadCoverLetterPdf} disabled={coverLetterPdfLoading}>
                    {coverLetterPdfLoading ? t.tailorPdfPreparing : t.tailorDownloadPdfBtn}
                  </Button>
                </div>
                {coverLetterPdfError && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 8 }}>{coverLetterPdfError}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
