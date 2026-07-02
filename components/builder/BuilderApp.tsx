'use client'

import { useState } from 'react'
import Link from 'next/link'
import '@/app/builder/print.css'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import Logo from '@/components/ui/Logo'
import { useLang } from '@/lib/LangContext'
import { useSiteContent } from '@/lib/SiteContentContext'

/* ── Types ───────────────────────────────────────────── */
interface Experience {
  id: string
  company: string
  role: string
  start: string
  end: string
  current: boolean
  bullets: string[]
}

interface Education {
  id: string
  school: string
  degree: string
  field: string
  start: string
  end: string
  gpa: string
}

interface ResumeData {
  personal: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    website: string
    summary: string
  }
  experience: Experience[]
  education: Education[]
  skills: string[]
}

const EMPTY: ResumeData = {
  personal: { name: '', title: '', email: '', phone: '', location: '', website: '', summary: '' },
  experience: [],
  education: [],
  skills: [],
}

type StepId = 'personal' | 'experience' | 'education' | 'skills' | 'preview'
const STEP_IDS: StepId[] = ['personal', 'experience', 'education', 'skills', 'preview']

/* ── Shared input style ──────────────────────────────── */
const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--surface-2)',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color .2s',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink-mute)',
  letterSpacing: '.06em',
  marginBottom: 7,
}

function Field({ lbl, children }: { lbl: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={labelStyle}>{lbl}</span>
      {children}
    </div>
  )
}

function FocusInp({ style: extra, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inp, ...extra }}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')}
    />
  )
}

function FocusTA({ style: extra, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inp, resize: 'vertical', minHeight: 90, ...extra }}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line-2)')}
    />
  )
}

/* ── Step rail ───────────────────────────────────────── */
function StepRail({ step, setStep, labels }: { step: StepId; setStep: (s: StepId) => void; labels: string[] }) {
  const idx = STEP_IDS.findIndex(s => s === step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36, flexWrap: 'wrap', rowGap: 10 }}>
      {STEP_IDS.map((id, i) => (
        <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setStep(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)',
              background: i < idx ? 'linear-gradient(140deg,var(--accent),var(--accent-2))' : i === idx ? 'var(--accent)' : 'var(--surface-3)',
              color: i <= idx ? 'var(--accent-ink)' : 'var(--ink-faint)',
              transition: 'all .25s',
            }}>
              {i < idx ? <Icon name="check" size={12} stroke={2.5} /> : i + 1}
            </div>
            <span style={{
              fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 600,
              color: i === idx ? 'var(--ink)' : i < idx ? 'var(--ink-soft)' : 'var(--ink-faint)',
              transition: 'color .2s',
            }}>
              {labels[i]}
            </span>
          </button>
          {i < STEP_IDS.length - 1 && (
            <div style={{ width: 28, height: 1, background: i < idx ? 'var(--accent)' : 'var(--line-2)', margin: '0 6px', transition: 'background .3s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Step: Personal Info ─────────────────────────────── */
function StepPersonal({ data, onChange }: { data: ResumeData['personal']; onChange: (d: ResumeData['personal']) => void }) {
  const { t } = useLang()
  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...data, [k]: e.target.value })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeUp .4s both' }}>
      <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', marginBottom: 4 }}>{t.builderSteps[0]}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field lbl={t.builderFullName}><FocusInp value={data.name} onChange={set('name')} placeholder="Alex Johnson" /></Field>
        <Field lbl={t.builderJobTitle}><FocusInp value={data.title} onChange={set('title')} placeholder="Senior Product Manager" /></Field>
        <Field lbl={t.builderEmail}><FocusInp type="email" value={data.email} onChange={set('email')} placeholder="alex@example.com" /></Field>
        <Field lbl={t.builderPhone}><FocusInp value={data.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" /></Field>
        <Field lbl={t.builderLocation}><FocusInp value={data.location} onChange={set('location')} placeholder="San Francisco, CA" /></Field>
        <Field lbl={t.builderWebsite}><FocusInp value={data.website} onChange={set('website')} placeholder="linkedin.com/in/alexj" /></Field>
      </div>
      <Field lbl={t.builderSummary}>
        <FocusTA value={data.summary} onChange={set('summary')} placeholder={t.builderSummaryPlaceholder} rows={4} />
      </Field>
    </div>
  )
}

/* ── Step: Experience ────────────────────────────────── */
function StepExperience({ data, onChange }: { data: Experience[]; onChange: (d: Experience[]) => void }) {
  const { t } = useLang()
  const add = () => onChange([...data, { id: crypto.randomUUID(), company: '', role: '', start: '', end: '', current: false, bullets: [''] }])
  const remove = (id: string) => onChange(data.filter(e => e.id !== id))
  const update = (id: string, patch: Partial<Experience>) =>
    onChange(data.map(e => e.id === id ? { ...e, ...patch } : e))
  const setBullet = (id: string, bi: number, val: string) =>
    onChange(data.map(e => e.id === id ? { ...e, bullets: e.bullets.map((b, i) => i === bi ? val : b) } : e))
  const addBullet = (id: string) =>
    onChange(data.map(e => e.id === id ? { ...e, bullets: [...e.bullets, ''] } : e))
  const removeBullet = (id: string, bi: number) =>
    onChange(data.map(e => e.id === id ? { ...e, bullets: e.bullets.filter((_, i) => i !== bi) } : e))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp .4s both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)' }}>{t.builderWorkExp}</h2>
        <Button size="sm" variant="ghost" onClick={add}>{t.builderAddJob}</Button>
      </div>
      {data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed var(--line-2)', borderRadius: 'var(--r-lg)', color: 'var(--ink-mute)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
          <p style={{ fontSize: 15 }}>{t.builderNoJobs}</p>
        </div>
      )}
      {data.map((exp, ei) => (
        <div key={exp.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-soft)' }}>
              {t.builderJobLabel} {ei + 1}
            </span>
            <button onClick={() => remove(exp.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--roast)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field lbl={t.builderCompany}><FocusInp value={exp.company} onChange={e => update(exp.id, { company: e.target.value })} placeholder="Acme Corp" /></Field>
            <Field lbl={t.builderRole}><FocusInp value={exp.role} onChange={e => update(exp.id, { role: e.target.value })} placeholder="Senior Engineer" /></Field>
            <Field lbl={t.builderStartDate}><FocusInp value={exp.start} onChange={e => update(exp.id, { start: e.target.value })} placeholder="Jan 2022" /></Field>
            <Field lbl={t.builderEndDate}>
              <FocusInp value={exp.current ? 'Present' : exp.end} onChange={e => update(exp.id, { end: e.target.value })} placeholder="Dec 2024" disabled={exp.current} style={{ opacity: exp.current ? 0.5 : 1 }} />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink-mute)' }}>
            <input type="checkbox" checked={exp.current} onChange={e => update(exp.id, { current: e.target.checked, end: '' })} />
            {t.builderCurrently}
          </label>
          <div>
            <span style={labelStyle}>{t.builderBullets}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exp.bullets.map((b, bi) => (
                <div key={bi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ marginTop: 12, color: 'var(--accent)', fontSize: 18, lineHeight: 1 }}>·</span>
                  <FocusTA value={b} onChange={e => setBullet(exp.id, bi, e.target.value)} placeholder="Increased revenue by 30% through..." style={{ minHeight: 60, flex: 1 }} />
                  {exp.bullets.length > 1 && (
                    <button onClick={() => removeBullet(exp.id, bi)} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--roast)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}>
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addBullet(exp.id)}
                style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--line-2)', borderRadius: 'var(--r-sm)', padding: '6px 12px', fontSize: 13, color: 'var(--ink-mute)', cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--ink-mute)' }}>
                {t.builderAddBullet}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Step: Education ─────────────────────────────────── */
function StepEducation({ data, onChange }: { data: Education[]; onChange: (d: Education[]) => void }) {
  const { t } = useLang()
  const add = () => onChange([...data, { id: crypto.randomUUID(), school: '', degree: '', field: '', start: '', end: '', gpa: '' }])
  const remove = (id: string) => onChange(data.filter(e => e.id !== id))
  const update = (id: string, patch: Partial<Education>) =>
    onChange(data.map(e => e.id === id ? { ...e, ...patch } : e))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp .4s both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)' }}>{t.builderEducation}</h2>
        <Button size="sm" variant="ghost" onClick={add}>{t.builderAddSchool}</Button>
      </div>
      {data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed var(--line-2)', borderRadius: 'var(--r-lg)', color: 'var(--ink-mute)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎓</div>
          <p style={{ fontSize: 15 }}>{t.builderNoSchools}</p>
        </div>
      )}
      {data.map((edu, ei) => (
        <div key={edu.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-soft)' }}>{t.builderEntryLabel} {ei + 1}</span>
            <button onClick={() => remove(edu.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--roast)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field lbl={t.builderSchool}><FocusInp value={edu.school} onChange={e => update(edu.id, { school: e.target.value })} placeholder="MIT" /></Field>
            <Field lbl={t.builderDegree}><FocusInp value={edu.degree} onChange={e => update(edu.id, { degree: e.target.value })} placeholder="Bachelor of Science" /></Field>
            <Field lbl={t.builderField}><FocusInp value={edu.field} onChange={e => update(edu.id, { field: e.target.value })} placeholder="Computer Science" /></Field>
            <Field lbl={t.builderGpa}><FocusInp value={edu.gpa} onChange={e => update(edu.id, { gpa: e.target.value })} placeholder="3.8 / 4.0" /></Field>
            <Field lbl={t.builderStartYear}><FocusInp value={edu.start} onChange={e => update(edu.id, { start: e.target.value })} placeholder="2018" /></Field>
            <Field lbl={t.builderEndYear}><FocusInp value={edu.end} onChange={e => update(edu.id, { end: e.target.value })} placeholder="2022" /></Field>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Step: Skills ────────────────────────────────────── */
function StepSkills({ data, onChange }: { data: string[]; onChange: (d: string[]) => void }) {
  const { t } = useLang()
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !data.includes(trimmed)) {
      onChange([...data, trimmed])
      setInput('')
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && data.length) onChange(data.slice(0, -1))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp .4s both' }}>
      <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', marginBottom: 4 }}>{t.builderSkills}</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: -12 }}>
        {t.builderSkillsHint.split('Enter').map((part, i) => i === 0
          ? <span key={i}>{part}<kbd style={{ background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>Enter</kbd></span>
          : <span key={i}>{part}</span>
        )}
      </p>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
        padding: '12px', background: 'var(--surface-2)',
        border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)',
        minHeight: 56, cursor: 'text',
      }}
        onClick={() => document.getElementById('skill-input')?.focus()}
      >
        {data.map(skill => (
          <span key={skill} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999,
            background: 'color-mix(in srgb, var(--accent) 15%, var(--surface-3))',
            border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
            color: 'var(--ink)', fontSize: 13, fontWeight: 500,
          }}>
            {skill}
            <button onClick={() => onChange(data.filter(s => s !== skill))}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex', lineHeight: 1 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--roast)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-mute)')}>
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          id="skill-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={data.length === 0 ? t.builderSkillsPlaceholder : ''}
          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 14, minWidth: 140, flex: 1 }}
        />
      </div>
      {data.length > 0 && (
        <button onClick={() => onChange([])}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink-faint)', fontSize: 13, cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--roast)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}>
          {t.builderClearAll}
        </button>
      )}
    </div>
  )
}

/* ── Resume Preview Doc ──────────────────────────────── */
function ResumeDoc({ data, t }: { data: ResumeData; t: ReturnType<typeof useLang>['t'] }) {
  const { personal: p, experience, education, skills } = data
  const hasContent = p.name || p.email || experience.length > 0 || education.length > 0 || skills.length > 0

  const sectionHead: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
    color: '#555', textTransform: 'uppercase' as const,
    borderBottom: '1.5px solid #e0e0e0', paddingBottom: 4,
    marginBottom: 10, marginTop: 20,
  }

  if (!hasContent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-faint)', gap: 12, padding: 40 }}>
        <div style={{ fontSize: 40 }}>📄</div>
        <p style={{ fontSize: 14, textAlign: 'center' }}>{t.builderPreviewEmpty}</p>
      </div>
    )
  }

  return (
    <div className="resume-doc" style={{
      background: '#fff', color: '#111',
      fontFamily: "'Hanken Grotesk', 'Inter', system-ui, sans-serif",
      fontSize: 13, lineHeight: 1.5,
      padding: '36px 40px', borderRadius: 'var(--r-md)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
      minHeight: 600,
    }}>
      {p.name && (
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.1, color: '#111' }}>{p.name}</h1>
          {p.title && <p style={{ fontSize: 14, color: '#555', margin: '4px 0 0', fontWeight: 500 }}>{p.title}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 8, fontSize: 12, color: '#666' }}>
            {p.email    && <span>{p.email}</span>}
            {p.phone    && <span>{p.phone}</span>}
            {p.location && <span>{p.location}</span>}
            {p.website  && <span>{p.website}</span>}
          </div>
        </div>
      )}

      {p.summary && (
        <>
          <div style={sectionHead}>{t.builderSummarySection}</div>
          <p style={{ margin: 0, color: '#333', fontSize: 13 }}>{p.summary}</p>
        </>
      )}

      {experience.length > 0 && (
        <>
          <div style={sectionHead}>{t.builderExpSection}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {experience.map(exp => (
              <div key={exp.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{exp.role || <span style={{ color: '#aaa' }}>Role</span>}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>
                    {exp.start}{(exp.start || exp.end) ? ' – ' : ''}{exp.current ? 'Present' : exp.end}
                  </span>
                </div>
                {exp.company && <div style={{ fontSize: 12, color: '#555', marginBottom: 5 }}>{exp.company}</div>}
                {exp.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} style={{ fontSize: 12.5, color: '#333' }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {education.length > 0 && (
        <>
          <div style={sectionHead}>{t.builderEduSection}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {education.map(edu => (
              <div key={edu.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{edu.school || <span style={{ color: '#aaa' }}>School</span>}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{edu.start}{(edu.start || edu.end) ? ' – ' : ''}{edu.end}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555' }}>
                  {[edu.degree, edu.field].filter(Boolean).join(' · ')}
                  {edu.gpa && <span style={{ color: '#777' }}> · GPA {edu.gpa}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {skills.length > 0 && (
        <>
          <div style={sectionHead}>{t.builderSkillsSection}</div>
          <p style={{ margin: 0, fontSize: 13, color: '#333' }}>{skills.join(' · ')}</p>
        </>
      )}
    </div>
  )
}

/* ── Main Builder ────────────────────────────────────── */
export default function BuilderApp() {
  const { t, lang } = useLang()
  const sc = useSiteContent()
  const sTitle = sc.builderTitle?.[lang as 'en' | 'fa'] || t.builderTitle
  const [step, setStep] = useState<StepId>('personal')
  const [data, setData] = useState<ResumeData>(EMPTY)

  const stepIdx = STEP_IDS.findIndex(s => s === step)
  const isLast = stepIdx === STEP_IDS.length - 1
  const isFirst = stepIdx === 0

  const next = () => !isLast && setStep(STEP_IDS[stepIdx + 1])
  const prev = () => !isFirst && setStep(STEP_IDS[stepIdx - 1])

  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-lg)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.4)',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px clamp(20px,5vw,60px)',
        background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
        backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={24} />
        </Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink-soft)' }}>
          {sTitle}
        </span>
        <Link href="/" style={{
          textDecoration: 'none', fontSize: 14, color: 'var(--ink-mute)',
          fontFamily: 'var(--font-body)', padding: '8px 14px',
          transition: 'color .2s',
        }}>{t.blogBackHome}</Link>
      </div>

      {/* Print wrapper */}
      <div className="resume-print-root" style={{ display: 'none' }}>
        <ResumeDoc data={data} t={t} />
      </div>

      {/* Main two-column layout */}
      <div style={{
        maxWidth: 1300, margin: '0 auto',
        padding: 'clamp(28px,4vw,48px) clamp(20px,5vw,60px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,0.85fr)',
        gap: 28, alignItems: 'start',
      }}
        className="hero-grid"
      >
        {/* Left: form */}
        <div style={{ ...card, padding: 'clamp(24px,3vw,36px)' }}>
          <StepRail step={step} setStep={setStep} labels={t.builderSteps} />

          {step === 'personal'   && <StepPersonal   data={data.personal}   onChange={p  => setData({ ...data, personal:   p  })} />}
          {step === 'experience' && <StepExperience data={data.experience} onChange={ex => setData({ ...data, experience: ex })} />}
          {step === 'education'  && <StepEducation  data={data.education}  onChange={ed => setData({ ...data, education:  ed })} />}
          {step === 'skills'     && <StepSkills     data={data.skills}     onChange={sk => setData({ ...data, skills:     sk })} />}
          {step === 'preview'    && (
            <div style={{ animation: 'fadeUp .4s both' }}>
              <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', marginBottom: 8 }}>{t.builderLookingGood}</h2>
              <p style={{ fontSize: 15, color: 'var(--ink-mute)', marginBottom: 24 }}>
                {t.builderPreviewDesc}
              </p>
              <Button size="lg" icon="download" onClick={() => window.print()}>{t.builderExportPdf}</Button>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
            <Button variant="quiet" size="sm" icon="back" onClick={prev} style={{ visibility: isFirst ? 'hidden' : 'visible' }}>{t.builderBack}</Button>
            {!isLast && <Button size="md" iconRight="arrow" onClick={next}>{t.builderNextPrefix} {t.builderSteps[stepIdx + 1]}</Button>}
            {isLast  && <Button size="md" icon="download" onClick={() => window.print()}>{t.builderExportPdf}</Button>}
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{ position: 'sticky', top: 90 }}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="eyebrow">{t.builderLivePreview}</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--intl)', boxShadow: '0 0 6px var(--intl)', animation: 'blink 1.4s infinite' }} />
          </div>
          <ResumeDoc data={data} t={t} />
        </div>
      </div>
    </div>
  )
}
