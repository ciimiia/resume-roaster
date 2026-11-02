/**
 * Smoke test for lib/fileValidation.ts. Run with:
 *   npx tsx scripts/test-fileValidation.ts
 */

import { validateResumeFile, MAX_RESUME_FILE_SIZE } from '../lib/fileValidation'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

// A real PDF
const pdfBuffer = Buffer.concat([Buffer.from('%PDF-1.4\n', 'ascii'), Buffer.alloc(100, 'x')])
check('valid PDF magic bytes accepted', (() => {
  const r = validateResumeFile(pdfBuffer, 'resume.pdf')
  return r.valid && r.detectedType === 'pdf'
})())

// A fake PDF — .pdf extension but wrong bytes (e.g. a renamed JPEG)
const fakePdf = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 'x')])
check('file with .pdf extension but non-PDF bytes is rejected', !validateResumeFile(fakePdf, 'resume.pdf').valid)

// A real-ish DOCX — ZIP magic + .docx extension + Content_Types.xml marker
const docxBuffer = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.alloc(20, 0),
  Buffer.from('[Content_Types].xml', 'ascii'),
  Buffer.alloc(100, 'x'),
])
check('valid DOCX magic bytes + marker accepted', (() => {
  const r = validateResumeFile(docxBuffer, 'resume.docx')
  return r.valid && r.detectedType === 'docx'
})())

// A ZIP that isn't a DOCX (no Content_Types.xml marker, e.g. a renamed .zip)
const plainZip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(100, 'x')])
check('plain ZIP renamed to .docx without DOCX marker is rejected', !validateResumeFile(plainZip, 'resume.docx').valid)

// DOCX bytes but wrong extension
check('DOCX bytes with .zip extension rejected (extension must match)', !validateResumeFile(docxBuffer, 'resume.zip').valid)

// Empty file
check('empty file rejected', (() => {
  const r = validateResumeFile(Buffer.alloc(0), 'resume.pdf')
  return !r.valid && r.reason === 'EMPTY'
})())

// Oversized file
const oversized = Buffer.concat([Buffer.from('%PDF-1.4\n', 'ascii'), Buffer.alloc(MAX_RESUME_FILE_SIZE + 1, 'x')])
check('file over 5MB rejected', (() => {
  const r = validateResumeFile(oversized, 'resume.pdf')
  return !r.valid && r.reason === 'TOO_LARGE'
})())

// Completely unrelated file type
check('plain text file rejected', !validateResumeFile(Buffer.from('just some text', 'ascii'), 'resume.txt').valid)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed')
