'use client'

import { useState } from 'react'
import { useLang } from '@/lib/LangContext'
import { cardStyle } from '@/lib/styles'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import Pill from '@/components/ui/Pill'
import type { ParsedProfile, JobPreferences } from '@/lib/resumeProfile'
import { EMPTY_PROFILE, EMPTY_JOB_PREFERENCES, SENIORITY_LEVELS, REMOTE_TYPES } from '@/lib/resumeProfile'

interface ProfileRecord extends ParsedProfile {
  approved: boolean
}
interface ResumeListItem {
  id: string
  originalFilename: string
  version: number
  createdAt: string
  hasParsedProfile: boolean
}

interface Props {
  initialProfile: ProfileRecord | null
  initialPreferences: (JobPreferences & { userId: string; updatedAt: string }) | null
  initialResumes: ResumeListItem[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: 'var(--surface-2)', border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-sm)', color: 'var(--ink)',
  fontFamily: 'var(--font-body)', fontSize: 14.5, outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)',
  color: 'var(--ink-mute)', letterSpacing: '.06em', marginBottom: 6,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><span style={labelStyle}>{label}</span>{children}</div>
}

export default function ProfileClient({ initialProfile, initialPreferences, initialResumes }: Props) {
  const { t } = useLang()

  const [resumes, setResumes] = useState(initialResumes)
  const [profile, setProfile] = useState<ParsedProfile>(initialProfile ?? EMPTY_PROFILE)
  const [sourceResumeId, setSourceResumeId] = useState<string | null>(null)
  const [approved, setApproved] = useState(initialProfile?.approved ?? false)
  const [prefs, setPrefs] = useState<JobPreferences>(initialPreferences ?? EMPTY_JOB_PREFERENCES)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [parseWarning, setParseWarning] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDone, setDeleteDone] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [retryError, setRetryError] = useState('')

  const hasProfile = resumes.length > 0 || initialProfile !== null

  const handleUpload = async (file: File) => {
    setUploadError('')
    setParseWarning('')
    if (file.size > 5 * 1024 * 1024) { setUploadError(t.profileUploadErrorTooLarge); return }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/resumes', { method: 'POST', body: formData })
      const data = await res.json() as { id?: string; parsed?: boolean; parseError?: string; error?: string }

      if (!res.ok || !data.id) {
        if (data.error === 'TOO_LARGE') setUploadError(t.profileUploadErrorTooLarge)
        else if (data.error === 'UNSUPPORTED_TYPE') setUploadError(t.profileUploadErrorType)
        else if (data.error === 'EMPTY') setUploadError(t.profileUploadErrorEmpty)
        else setUploadError(t.profileUploadErrorGeneric)
        return
      }

      setResumes(prev => [{ id: data.id!, originalFilename: file.name, version: prev.length + 1, createdAt: new Date().toISOString(), hasParsedProfile: !!data.parsed }, ...prev])
      setSourceResumeId(data.id)

      if (data.parsed) {
        const detail = await fetch(`/api/resumes/${data.id}`).then(r => r.json()) as { resume?: { parsedProfile?: ParsedProfile } }
        if (detail.resume?.parsedProfile) {
          setProfile(detail.resume.parsedProfile)
          setApproved(false)
        }
      } else {
        setParseWarning(t.profileParseErrorGeneric)
      }
    } catch {
      setUploadError(t.profileUploadErrorGeneric)
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async (approve: boolean) => {
    setSavingProfile(true)
    setProfileSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, sourceResumeId, approved: approve }),
      })
      if (res.ok) {
        setApproved(approve)
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 2500)
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const savePrefs = async () => {
    setSavingPrefs(true)
    setPrefsSaved(false)
    try {
      const res = await fetch('/api/job-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (res.ok) {
        setPrefsSaved(true)
        setTimeout(() => setPrefsSaved(false), 2500)
      }
    } finally {
      setSavingPrefs(false)
    }
  }

  const retryParse = async (id: string) => {
    setRetryError('')
    setRetryingId(id)
    try {
      const res = await fetch(`/api/resumes/${id}/retry-parse`, { method: 'POST' })
      const data = await res.json() as { parsed?: boolean; error?: string }
      if (!res.ok) {
        setRetryError(data.error === 'RATE_LIMITED' ? t.profileRetryRateLimited : t.profileRetryFailed)
        return
      }
      if (!data.parsed) {
        setRetryError(t.profileRetryFailed)
        return
      }
      setResumes(prev => prev.map(r => r.id === id ? { ...r, hasParsedProfile: true } : r))
      const detail = await fetch(`/api/resumes/${id}`).then(r => r.json()) as { resume?: { parsedProfile?: ParsedProfile } }
      if (detail.resume?.parsedProfile) {
        setProfile(detail.resume.parsedProfile)
        setSourceResumeId(id)
        setApproved(false)
      }
    } catch {
      setRetryError(t.profileRetryFailed)
    } finally {
      setRetryingId(null)
    }
  }

  const deleteMyData = async () => {
    if (!confirm(t.profileDeleteConfirm)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/data', { method: 'DELETE' })
      if (res.ok) {
        setResumes([])
        setProfile(EMPTY_PROFILE)
        setApproved(false)
        setPrefs(EMPTY_JOB_PREFERENCES)
        setSourceResumeId(null)
        setDeleteDone(true)
      }
    } finally {
      setDeleting(false)
    }
  }

  const splitLines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)
  const splitCommas = (s: string) => s.split(',').map(l => l.trim()).filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', padding: '0 var(--gutter) 100px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ padding: 'var(--sp-9) 0 var(--sp-6)' }}>
          <div className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>{t.profileEyebrow}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-2xl)' }}>{t.profileTitle}</h1>
          <p style={{ fontSize: 'var(--fs-base)', color: 'var(--ink-mute)', marginTop: 'var(--sp-2)', maxWidth: 560 }}>{t.profileSubtitle}</p>
        </div>

        {/* Upload */}
        <div style={cardStyle({ padding: 'var(--sp-6)', marginBottom: 'var(--sp-5)' })}>
          <h3 style={{ fontSize: 16, marginBottom: 'var(--sp-1)' }}>{t.profileUploadTitle}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 'var(--sp-4)' }}>{t.profileUploadDesc}</p>
          <label style={{ display: 'inline-block' }}>
            <input
              type="file" accept=".pdf,.docx" style={{ display: 'none' }}
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
            />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px',
              borderRadius: 'var(--r-md)', background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
              color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
              cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1,
            }}>
              {uploading
                ? <><span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> {t.profileUploading}</>
                : <><Icon name="upload" size={15} /> {t.profileUploadBtn}</>}
            </span>
          </label>
          {uploadError && (
            <div style={{ marginTop: 'var(--sp-3)', padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, var(--roast) 10%, var(--surface-2))', border: '1px solid color-mix(in srgb, var(--roast) 30%, transparent)', color: 'var(--roast)', fontSize: 13.5 }}>
              {uploadError}
            </div>
          )}
          {parseWarning && (
            <div style={{ marginTop: 'var(--sp-3)', padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--line-2)', color: 'var(--ink-mute)', fontSize: 13.5 }}>
              {parseWarning}
            </div>
          )}
          {resumes.length > 0 && (
            <div style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resumes.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--ink-mute)' }}>
                  <Icon name="doc" size={14} />
                  <span>{r.originalFilename}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>v{r.version}</span>
                  {!r.hasParsedProfile && (
                    <button
                      onClick={() => retryParse(r.id)}
                      disabled={retryingId === r.id}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12.5, cursor: retryingId === r.id ? 'wait' : 'pointer' }}
                    >
                      {retryingId === r.id ? t.profileRetrying : t.profileRetryParseBtn}
                    </button>
                  )}
                </div>
              ))}
              {retryError && (
                <div style={{ fontSize: 13, color: 'var(--roast)' }}>{retryError}</div>
              )}
            </div>
          )}
        </div>

        {/* Review */}
        {hasProfile && (
          <div style={cardStyle({ padding: 'var(--sp-6)', marginBottom: 'var(--sp-5)' })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-1)' }}>
              <h3 style={{ fontSize: 16 }}>{t.profileReviewTitle}</h3>
              <Pill tone={approved ? 'good' : 'mute'}>{approved ? t.profileApprovedBadge : t.profileNotApprovedBadge}</Pill>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 'var(--sp-5)' }}>{t.profileReviewDesc}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              {/* Contact */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>{t.profileSectionContact}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                  <Field label={t.profileFieldName}>
                    <input style={inputStyle} value={profile.contact.name}
                      onChange={e => setProfile(p => ({ ...p, contact: { ...p.contact, name: e.target.value } }))} />
                  </Field>
                  <Field label={t.profileFieldEmail}>
                    <input style={inputStyle} value={profile.contact.email ?? ''}
                      onChange={e => setProfile(p => ({ ...p, contact: { ...p.contact, email: e.target.value } }))} />
                  </Field>
                  <Field label={t.profileFieldPhone}>
                    <input style={inputStyle} value={profile.contact.phone ?? ''}
                      onChange={e => setProfile(p => ({ ...p, contact: { ...p.contact, phone: e.target.value } }))} />
                  </Field>
                  <Field label={t.profileFieldLocation}>
                    <input style={inputStyle} value={profile.contact.location ?? ''}
                      onChange={e => setProfile(p => ({ ...p, contact: { ...p.contact, location: e.target.value } }))} />
                  </Field>
                </div>
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <Field label={t.profileFieldLinks}>
                    <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={profile.contact.links.join('\n')}
                      onChange={e => setProfile(p => ({ ...p, contact: { ...p.contact, links: splitLines(e.target.value) } }))} />
                  </Field>
                </div>
              </div>

              {/* Summary */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>{t.profileSectionSummary}</div>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={profile.summary}
                  onChange={e => setProfile(p => ({ ...p, summary: e.target.value }))} />
              </div>

              {/* Experience */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                  <div className="eyebrow">{t.profileSectionExperience}</div>
                  <button onClick={() => setProfile(p => ({ ...p, experience: [...p.experience, { company: '', title: '', bullets: [], current: false }] }))}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}>{t.profileAddEntry}</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                  {profile.experience.map((exp, i) => (
                    <div key={i} style={{ padding: 'var(--sp-4)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                        <Field label={t.profileFieldCompany}>
                          <input style={inputStyle} value={exp.company} onChange={e => setProfile(p => ({ ...p, experience: p.experience.map((x, j) => j === i ? { ...x, company: e.target.value } : x) }))} />
                        </Field>
                        <Field label={t.profileFieldJobTitle}>
                          <input style={inputStyle} value={exp.title} onChange={e => setProfile(p => ({ ...p, experience: p.experience.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))} />
                        </Field>
                        <Field label={t.profileFieldStartDate}>
                          <input style={inputStyle} value={exp.startDate ?? ''} onChange={e => setProfile(p => ({ ...p, experience: p.experience.map((x, j) => j === i ? { ...x, startDate: e.target.value } : x) }))} />
                        </Field>
                        <Field label={t.profileFieldEndDate}>
                          <input style={inputStyle} value={exp.endDate ?? ''} disabled={exp.current} onChange={e => setProfile(p => ({ ...p, experience: p.experience.map((x, j) => j === i ? { ...x, endDate: e.target.value } : x) }))} />
                        </Field>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <input type="checkbox" checked={exp.current} onChange={e => setProfile(p => ({ ...p, experience: p.experience.map((x, j) => j === i ? { ...x, current: e.target.checked } : x) }))} />
                        {t.profileFieldCurrent}
                      </label>
                      <Field label={t.profileFieldBullets}>
                        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={exp.bullets.join('\n')}
                          onChange={e => setProfile(p => ({ ...p, experience: p.experience.map((x, j) => j === i ? { ...x, bullets: splitLines(e.target.value) } : x) }))} />
                      </Field>
                      <button onClick={() => setProfile(p => ({ ...p, experience: p.experience.filter((_, j) => j !== i) }))}
                        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--roast)', fontSize: 12.5, cursor: 'pointer' }}>{t.profileRemoveEntry}</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                  <div className="eyebrow">{t.profileSectionEducation}</div>
                  <button onClick={() => setProfile(p => ({ ...p, education: [...p.education, { school: '' }] }))}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}>{t.profileAddEntry}</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  {profile.education.map((ed, i) => (
                    <div key={i} style={{ padding: 'var(--sp-4)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                      <Field label={t.profileFieldSchool}>
                        <input style={inputStyle} value={ed.school} onChange={e => setProfile(p => ({ ...p, education: p.education.map((x, j) => j === i ? { ...x, school: e.target.value } : x) }))} />
                      </Field>
                      <Field label={t.profileFieldDegree}>
                        <input style={inputStyle} value={ed.degree ?? ''} onChange={e => setProfile(p => ({ ...p, education: p.education.map((x, j) => j === i ? { ...x, degree: e.target.value } : x) }))} />
                      </Field>
                      <Field label={t.profileFieldField}>
                        <input style={inputStyle} value={ed.field ?? ''} onChange={e => setProfile(p => ({ ...p, education: p.education.map((x, j) => j === i ? { ...x, field: e.target.value } : x) }))} />
                      </Field>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={() => setProfile(p => ({ ...p, education: p.education.filter((_, j) => j !== i) }))}
                          style={{ background: 'none', border: 'none', color: 'var(--roast)', fontSize: 12.5, cursor: 'pointer' }}>{t.profileRemoveEntry}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>{t.profileSectionSkills}</div>
                <Field label={t.profileFieldSkillsHint}>
                  <input style={inputStyle} value={profile.skills.join(', ')}
                    onChange={e => setProfile(p => ({ ...p, skills: splitCommas(e.target.value) }))} />
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--line)' }}>
              <Button icon="check" onClick={() => saveProfile(true)} disabled={savingProfile}>{t.profileApproveBtn}</Button>
              <Button variant="ghost" onClick={() => saveProfile(false)} disabled={savingProfile}>{t.profileSaveBtn}</Button>
              {profileSaved && <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--intl)' }}>{t.profileSaved}</span>}
            </div>
          </div>
        )}

        {!hasProfile && (
          <div style={cardStyle({ padding: 'var(--sp-6)', marginBottom: 'var(--sp-5)', textAlign: 'center', color: 'var(--ink-mute)', fontSize: 14 })}>
            {t.profileNoResumeYet}
          </div>
        )}

        {/* Job preferences */}
        <div style={cardStyle({ padding: 'var(--sp-6)', marginBottom: 'var(--sp-5)' })}>
          <h3 style={{ fontSize: 16, marginBottom: 'var(--sp-1)' }}>{t.profilePrefsTitle}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 'var(--sp-5)' }}>{t.profilePrefsDesc}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <Field label={t.prefsFieldTitles}>
              <input style={inputStyle} value={prefs.targetTitles.join(', ')}
                onChange={e => setPrefs(p => ({ ...p, targetTitles: splitCommas(e.target.value) }))} />
            </Field>

            <Field label={t.prefsFieldSeniority}>
              <select style={inputStyle} value={prefs.seniority ?? ''}
                onChange={e => setPrefs(p => ({ ...p, seniority: (e.target.value || undefined) as JobPreferences['seniority'] }))}>
                <option value="">—</option>
                {SENIORITY_LEVELS.map(s => <option key={s} value={s}>{t[`seniority${s[0].toUpperCase()}${s.slice(1)}` as keyof typeof t] as string}</option>)}
              </select>
            </Field>

            <Field label={t.prefsFieldLocations}>
              <input style={inputStyle} value={prefs.locations.join(', ')}
                onChange={e => setPrefs(p => ({ ...p, locations: splitCommas(e.target.value) }))} />
            </Field>

            <div>
              <span style={labelStyle}>{t.prefsFieldRemote}</span>
              <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
                {REMOTE_TYPES.map(rt => (
                  <label key={rt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
                    <input type="checkbox" checked={prefs.remoteType.includes(rt)}
                      onChange={e => setPrefs(p => ({ ...p, remoteType: e.target.checked ? [...p.remoteType, rt] : p.remoteType.filter(x => x !== rt) }))} />
                    {rt === 'remote' ? t.prefsRemote : rt === 'hybrid' ? t.prefsHybrid : t.prefsOnsite}
                  </label>
                ))}
              </div>
            </div>

            <Field label={t.prefsFieldCountries}>
              <input style={inputStyle} value={prefs.countries.join(', ')}
                onChange={e => setPrefs(p => ({ ...p, countries: splitCommas(e.target.value) }))} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
              <Field label={t.prefsFieldSalaryMin}>
                <input type="number" style={inputStyle} value={prefs.salaryMin ?? ''}
                  onChange={e => setPrefs(p => ({ ...p, salaryMin: e.target.value ? Number(e.target.value) : undefined }))} />
              </Field>
              <Field label={t.prefsFieldSalaryMax}>
                <input type="number" style={inputStyle} value={prefs.salaryMax ?? ''}
                  onChange={e => setPrefs(p => ({ ...p, salaryMax: e.target.value ? Number(e.target.value) : undefined }))} />
              </Field>
              <Field label={t.prefsFieldCurrency}>
                <input style={inputStyle} value={prefs.salaryCurrency ?? ''}
                  onChange={e => setPrefs(p => ({ ...p, salaryCurrency: e.target.value || undefined }))} />
              </Field>
            </div>

            <Field label={t.prefsFieldVisa}>
              <input style={inputStyle} value={prefs.visaNeeds ?? ''}
                onChange={e => setPrefs(p => ({ ...p, visaNeeds: e.target.value || undefined }))} />
            </Field>

            <Field label={t.prefsFieldLanguages}>
              <input style={inputStyle} value={prefs.languages.join(', ')}
                onChange={e => setPrefs(p => ({ ...p, languages: splitCommas(e.target.value) }))} />
            </Field>

            <Field label={t.prefsFieldExcludedCompanies}>
              <input style={inputStyle} value={prefs.excludedCompanies.join(', ')}
                onChange={e => setPrefs(p => ({ ...p, excludedCompanies: splitCommas(e.target.value) }))} />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--line)' }}>
            <Button onClick={savePrefs} disabled={savingPrefs}>{t.profileSaveBtn}</Button>
            {prefsSaved && <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--intl)' }}>{t.profileSaved}</span>}
          </div>
        </div>

        {/* Danger zone */}
        <div style={cardStyle({ padding: 'var(--sp-6)', border: '1px solid color-mix(in srgb, var(--roast) 30%, var(--line))' })}>
          <h3 style={{ fontSize: 16, color: 'var(--roast)', marginBottom: 'var(--sp-1)' }}>{t.profileDangerZoneTitle}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 'var(--sp-4)' }}>{t.profileDangerZoneDesc}</p>
          {deleteDone
            ? <p style={{ fontSize: 14, color: 'var(--intl)' }}>{t.profileDeleteDone}</p>
            : <button onClick={deleteMyData} disabled={deleting} style={{
                padding: '10px 20px', borderRadius: 'var(--r-md)', background: 'none',
                border: '1px solid var(--roast)', color: 'var(--roast)', fontFamily: 'var(--font-display)',
                fontWeight: 600, fontSize: 14, cursor: deleting ? 'wait' : 'pointer',
              }}>{t.profileDeleteBtn}</button>}
        </div>
      </div>
    </div>
  )
}
