/**
 * Generates a real .docx file (via the `docx` library) and runs it through
 * the actual code path a real upload would use: magic-byte validation,
 * mammoth text extraction, and the LLM parsing step's schema handling.
 *
 * The LLM call itself is mocked (no OPENROUTER_API_KEY is readable in local
 * dev — see ARCHITECTURE notes — and we don't want this test hitting a real
 * API/cost on every run anyway). This still exercises every line of real
 * code except the network call: DOCX magic-byte sniffing, mammoth
 * extraction, prompt construction, and zod validation of the response.
 * The true end-to-end path (real model, real network) is verified manually
 * against a Preview deployment — see the Phase 1b report.
 *
 * lib/resumeParsing.ts imports 'server-only', which throws outside a Next
 * build unless the "react-server" export condition is active — hence the
 * NODE_OPTIONS below (same reason `npm run test:docxFixture` sets it).
 *
 * Run with: cross-env NODE_OPTIONS=--conditions=react-server tsx scripts/test-docxFixture.ts
 */

import { Document, Packer, Paragraph, TextRun } from 'docx'
import { validateResumeFile } from '../lib/fileValidation'
import { parseResumeToProfile } from '../lib/resumeParsing'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const RESUME_NAME = 'Jordan Rivera'
const RESUME_EMAIL = 'jordan.rivera@example.com'
const RESUME_COMPANY = 'Northwind Analytics'

async function buildFixtureDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: RESUME_NAME, bold: true })] }),
        new Paragraph({ children: [new TextRun(RESUME_EMAIL)] }),
        new Paragraph({ children: [new TextRun('Summary: Data analyst with 5 years of experience in reporting pipelines.')] }),
        new Paragraph({ children: [new TextRun(`Experience: Senior Analyst at ${RESUME_COMPANY}, 2021–present.`)] }),
        new Paragraph({ children: [new TextRun('- Built dashboards used by 40+ stakeholders')] }),
        new Paragraph({ children: [new TextRun('Education: B.Sc. Statistics, State University, 2016–2020.')] }),
        new Paragraph({ children: [new TextRun('Skills: SQL, Python, Tableau')] }),
      ],
    }],
  })
  return Packer.toBuffer(doc)
}

async function main() {
  // The real key isn't readable in local dev (see ARCHITECTURE notes) and
  // isn't needed here — fetch is mocked below, so this never leaves the
  // process. Only lib/env's "is a key configured" check needs it set.
  process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key-not-real'

  const buffer = await buildFixtureDocx()
  check('generated fixture is non-empty', buffer.length > 0)

  // 1. Magic-byte validation — same function the upload route calls.
  const validation = validateResumeFile(buffer, 'resume.docx')
  check('validateResumeFile accepts the generated docx', validation.valid && validation.detectedType === 'docx')

  // 2. Real text extraction — same library the upload route calls.
  const mammoth = await import('mammoth')
  const extracted = await mammoth.extractRawText({ buffer })
  const text = extracted.value.trim()
  check('mammoth extracted non-trivial text', text.length > 50)
  check('extracted text contains the name', text.includes(RESUME_NAME))
  check('extracted text contains the company', text.includes(RESUME_COMPANY))

  // 3. Parsing step — mock the network call, exercise real prompt-building
  // and zod validation around it.
  const originalFetch = global.fetch
  let capturedBody: any = null
  global.fetch = (async (_url: string, init: any) => {
    capturedBody = JSON.parse(init.body)
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          contact: { name: RESUME_NAME, email: RESUME_EMAIL, links: [] },
          summary: 'Data analyst with 5 years of experience in reporting pipelines.',
          experience: [{ company: RESUME_COMPANY, title: 'Senior Analyst', startDate: '2021', current: true, bullets: ['Built dashboards used by 40+ stakeholders'] }],
          education: [{ school: 'State University', degree: 'B.Sc.', field: 'Statistics', startDate: '2016', endDate: '2020' }],
          skills: ['SQL', 'Python', 'Tableau'],
          projects: [],
          languages: [],
          certifications: [],
        }) } }],
      }),
    }
  }) as any

  try {
    const result = await parseResumeToProfile(text)
    check('parseResumeToProfile succeeds with a schema-valid mocked response', result.ok)
    if (result.ok) {
      check('parsed profile has the right name', result.profile.contact.name === RESUME_NAME)
      check('parsed profile has one experience entry', result.profile.experience.length === 1)
      check('parsed profile has the right company', result.profile.experience[0]?.company === RESUME_COMPANY)
    }
    check('the extracted docx text was sent to the model (not re-derived)', JSON.stringify(capturedBody).includes(RESUME_COMPANY))
    check('request used a paid, non-free model (not openrouter/free)', capturedBody?.model && capturedBody.model !== 'openrouter/free')
    check('request asked for data_collection: deny', capturedBody?.provider?.data_collection === 'deny')
  } finally {
    global.fetch = originalFetch
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

main()
