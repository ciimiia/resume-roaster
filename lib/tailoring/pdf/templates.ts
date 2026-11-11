/**
 * ATS-friendly single-column resume HTML — two templates ("modern" and
 * "classic", differing only in header/accent styling, both single-column
 * with standard <h1>/<h2> headings and no tables/columns/text-boxes,
 * which is what actually matters for ATS text extraction). Education,
 * certifications, languages, projects, and contact info are carried
 * through from the approved profile UNCHANGED — tailoring only ever
 * touches summary/experience bullets/skills (lib/tailoring/types.ts), so
 * there's nothing to "tailor" in those sections; they're rendered as-is.
 *
 * All text is HTML-escaped before insertion — this is UNTRUSTED DATA
 * (resume/job content, however it got here), never treated as markup;
 * escaping also means any prompt-injection-style text embedded in a
 * bullet just renders as inert literal text, same as everywhere else in
 * this codebase that handles resume/job text.
 */
import type { TailoredProfile } from '../types'
import type { ParsedProfile } from '@/lib/resumeProfile'
import { getVazirmatnFontFaceCss } from './fonts'

export type ResumeTemplateId = 'modern' | 'classic'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ACCENT: Record<ResumeTemplateId, string> = { modern: '#2563eb', classic: '#1f2937' }

export function buildResumeHtml(opts: {
  contact: ParsedProfile['contact']
  tailored: TailoredProfile
  education: ParsedProfile['education']
  certifications: ParsedProfile['certifications']
  languages: ParsedProfile['languages']
  projects: ParsedProfile['projects']
  template: ResumeTemplateId
  lang: 'en' | 'fa'
}): string {
  const dir = opts.lang === 'fa' ? 'rtl' : 'ltr'
  const accent = ACCENT[opts.template]
  const e = escapeHtml

  const headerBlock = opts.template === 'modern'
    ? `<div style="border-bottom:3px solid ${accent};padding-bottom:10px;margin-bottom:16px;">
         <h1 style="margin:0;font-size:24px;color:${accent};">${e(opts.contact.name || '')}</h1>
         <div style="font-size:11px;color:#444;margin-top:4px;">${contactLine(opts.contact, e)}</div>
       </div>`
    : `<div style="text-align:center;margin-bottom:16px;">
         <h1 style="margin:0;font-size:22px;letter-spacing:1px;">${e(opts.contact.name || '')}</h1>
         <div style="font-size:11px;color:#444;margin-top:4px;">${contactLine(opts.contact, e)}</div>
         <hr style="border:none;border-top:1px solid #999;margin-top:10px;" />
       </div>`

  const sectionHeading = (text: string) =>
    `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:${accent};border-bottom:1px solid #ddd;padding-bottom:3px;margin:18px 0 8px;">${e(text)}</h2>`

  const experienceHtml = opts.tailored.experience.map(entry => `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px;">
        <span>${e(entry.title)}</span>
      </div>
      <div style="font-size:12px;color:#555;margin-bottom:4px;">${e(entry.company)}</div>
      <ul style="margin:0;padding-${dir === 'rtl' ? 'right' : 'left'}:18px;font-size:12px;line-height:1.5;">
        ${entry.bullets.map(b => `<li>${e(b)}</li>`).join('')}
      </ul>
    </div>`).join('')

  const educationHtml = opts.education.map(ed => `
    <div style="font-size:12px;margin-bottom:6px;">
      <strong>${e([ed.degree, ed.field].filter(Boolean).join(', '))}</strong> — ${e(ed.school)}
      ${ed.startDate || ed.endDate ? `<span style="color:#777;"> (${e(ed.startDate ?? '')}${ed.startDate && ed.endDate ? ' - ' : ''}${e(ed.endDate ?? '')})</span>` : ''}
    </div>`).join('')

  const certificationsHtml = opts.certifications.length
    ? `<div style="font-size:12px;">${opts.certifications.map(c => e([c.name, c.issuer].filter(Boolean).join(' — '))).join(' &nbsp;|&nbsp; ')}</div>`
    : ''

  const languagesHtml = opts.languages.length
    ? `<div style="font-size:12px;">${opts.languages.map(l => e([l.name, l.proficiency].filter(Boolean).join(' - '))).join(' &nbsp;|&nbsp; ')}</div>`
    : ''

  const projectsHtml = opts.projects.length
    ? opts.projects.map(p => `<div style="font-size:12px;margin-bottom:4px;"><strong>${e(p.name)}</strong>${p.description ? ` — ${e(p.description)}` : ''}</div>`).join('')
    : ''

  return `<!doctype html>
<html dir="${dir}" lang="${opts.lang}">
<head>
<meta charset="utf-8" />
<style>
  ${getVazirmatnFontFaceCss()}
  * { box-sizing: border-box; }
  body { font-family: 'Vazirmatn', sans-serif; color: #1a1a1a; margin: 32px 40px; }
  ul { margin: 0; }
</style>
</head>
<body>
  ${headerBlock}
  ${opts.tailored.summary ? `${sectionHeading(opts.lang === 'fa' ? 'خلاصه' : 'Summary')}<p style="font-size:12px;line-height:1.5;margin:0;">${e(opts.tailored.summary)}</p>` : ''}
  ${experienceHtml ? `${sectionHeading(opts.lang === 'fa' ? 'سابقه کار' : 'Experience')}${experienceHtml}` : ''}
  ${opts.tailored.skills.length ? `${sectionHeading(opts.lang === 'fa' ? 'مهارت‌ها' : 'Skills')}<p style="font-size:12px;margin:0;">${opts.tailored.skills.map(e).join(' &nbsp;|&nbsp; ')}</p>` : ''}
  ${educationHtml ? `${sectionHeading(opts.lang === 'fa' ? 'تحصیلات' : 'Education')}${educationHtml}` : ''}
  ${certificationsHtml ? `${sectionHeading(opts.lang === 'fa' ? 'گواهی‌نامه‌ها' : 'Certifications')}${certificationsHtml}` : ''}
  ${languagesHtml ? `${sectionHeading(opts.lang === 'fa' ? 'زبان‌ها' : 'Languages')}${languagesHtml}` : ''}
  ${projectsHtml ? `${sectionHeading(opts.lang === 'fa' ? 'پروژه‌ها' : 'Projects')}${projectsHtml}` : ''}
</body>
</html>`
}

function contactLine(contact: ParsedProfile['contact'], e: (s: string) => string): string {
  return [contact.email, contact.phone, contact.location, ...contact.links].filter(Boolean).map(v => e(v!)).join(' &nbsp;|&nbsp; ')
}

export function buildCoverLetterHtml(opts: { name: string; letter: string; lang: 'en' | 'fa' }): string {
  const dir = opts.lang === 'fa' ? 'rtl' : 'ltr'
  const e = escapeHtml
  const paragraphs = opts.letter.split(/\n{2,}/).map(p => `<p style="margin:0 0 12px;">${e(p.trim())}</p>`).join('')
  return `<!doctype html>
<html dir="${dir}" lang="${opts.lang}">
<head>
<meta charset="utf-8" />
<style>
  ${getVazirmatnFontFaceCss()}
  body { font-family: 'Vazirmatn', sans-serif; color: #1a1a1a; margin: 48px 56px; font-size: 13px; line-height: 1.6; }
</style>
</head>
<body>${paragraphs}</body>
</html>`
}
