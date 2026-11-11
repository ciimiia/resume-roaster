/**
 * Real PDF generation test (headless Chromium, no paid API involved) for
 * both templates and both languages — confirms the renderer actually
 * produces a non-trivial PDF, and that extracted text contains the
 * expected content for Latin. Persian text-extraction ORDER is a known,
 * separately-documented limitation (see the Phase 4 report) — verified
 * visually during manual testing instead, not asserted here as extracted
 * text, since pdf.js's bidi reordering of RTL text content streams is
 * independently unreliable and not something this phase's code controls.
 *
 * Uses a locally installed Chrome/Edge (lib/tailoring/pdf/render.ts's
 * dev-time fallback) — this test is NOT run against the Vercel-deployed
 * @sparticuz/chromium path, which can only be verified on an actual
 * deployment (see the Phase 4 report's "what remains unverified" list).
 *
 * Run with:
 *   cross-env NODE_OPTIONS=--conditions=react-server tsx scripts/test-tailorPdf.ts
 */
import { buildResumeHtml, buildCoverLetterHtml } from '../lib/tailoring/pdf/templates'
import { renderHtmlToPdf } from '../lib/tailoring/pdf/render'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const SAMPLE_PROFILE_PARTS = {
  contact: { name: 'Jordan Rivera', email: 'jordan@example.com', phone: '', location: 'Remote', links: [] },
  tailored: {
    summary: 'Senior backend engineer with 7 years building distributed systems.',
    experience: [{ company: 'Acme Corp', title: 'Senior Backend Engineer', bullets: ['Built a Postgres-backed event pipeline processing 50M events/day'] }],
    skills: ['Node.js', 'TypeScript'],
    keywordsToEmphasize: [],
  },
  education: [{ school: 'State University', degree: 'B.Sc.', field: 'Computer Science' }],
  certifications: [], languages: [], projects: [],
}

async function main() {
  try {
    const enModern = buildResumeHtml({ ...SAMPLE_PROFILE_PARTS, template: 'modern', lang: 'en' })
    const enClassic = buildResumeHtml({ ...SAMPLE_PROFILE_PARTS, template: 'classic', lang: 'en' })
    const faResume = buildResumeHtml({
      ...SAMPLE_PROFILE_PARTS,
      contact: { name: 'جردن ریورا', email: 'jordan@example.com', phone: '', location: 'تهران', links: [] },
      tailored: { ...SAMPLE_PROFILE_PARTS.tailored, summary: 'مهندس ارشد بک‌اند با هفت سال تجربه.' },
      template: 'modern', lang: 'fa',
    })
    const coverLetterHtml = buildCoverLetterHtml({ name: 'Jordan Rivera', letter: 'Dear Hiring Manager,\n\nI am excited to apply for this role.\n\nSincerely,\nJordan', lang: 'en' })

    const [enModernPdf, enClassicPdf, faPdf, coverPdf] = await Promise.all([
      renderHtmlToPdf(enModern), renderHtmlToPdf(enClassic), renderHtmlToPdf(faResume), renderHtmlToPdf(coverLetterHtml),
    ])

    check('modern template renders a non-trivial PDF (Latin)', enModernPdf.length > 1000)
    check('classic template renders a non-trivial PDF (Latin)', enClassicPdf.length > 1000)
    check('modern template renders a non-trivial PDF (Persian)', faPdf.length > 1000)
    check('cover letter renders a non-trivial PDF', coverPdf.length > 1000)
    check('PDF starts with the %PDF magic bytes (modern)', enModernPdf.subarray(0, 5).toString('ascii') === '%PDF-')
    check('PDF starts with the %PDF magic bytes (Persian)', faPdf.subarray(0, 5).toString('ascii') === '%PDF-')

    const { PDFParse } = await import('pdf-parse')
    const enText = (await new PDFParse({ data: enModernPdf }).getText()).text
    check('extracted Latin PDF text contains the candidate name', enText.includes('Jordan Rivera'))
    check('extracted Latin PDF text contains a real bullet fact', enText.includes('50M events/day'))

    const coverText = (await new PDFParse({ data: coverPdf }).getText()).text
    check('extracted cover-letter PDF text contains the letter content', coverText.includes('excited to apply'))
  } catch (err) {
    console.error('PDF rendering threw:', err instanceof Error ? err.message : err)
    failures++
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
