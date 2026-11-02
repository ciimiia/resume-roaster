/**
 * Resume upload validation. Checks the file's actual bytes, not just its
 * claimed Content-Type or filename extension — a client can lie about
 * both, but can't make a JPEG start with `%PDF-`.
 */

export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export type DetectedFileType = 'pdf' | 'docx'

export type FileValidationResult =
  | { valid: true; detectedType: DetectedFileType }
  | { valid: false; reason: 'TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'EMPTY' }

const PDF_MAGIC = Buffer.from('%PDF-', 'ascii')
// DOCX (and all modern Office formats) is a ZIP container; ZIP's local
// file header signature is these 4 bytes.
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])

function startsWith(buf: Buffer, magic: Buffer): boolean {
  if (buf.length < magic.length) return false
  return buf.subarray(0, magic.length).equals(magic)
}

/**
 * For DOCX specifically: being a valid ZIP isn't enough on its own (a
 * renamed .xlsx or plain .zip would also pass) — DOCX's ZIP always
 * contains a `[Content_Types].xml` entry. This is a cheap heuristic
 * (substring search over the raw bytes, not a real ZIP parse) good enough
 * for "simple" validation; mammoth will fail cleanly at the parsing step
 * for anything that slips past this.
 *
 * Searches the whole buffer, not just a leading slice — an earlier version
 * only checked the first 4096 bytes on the assumption the entry would be
 * near the start, but real DOCX files (confirmed with a fixture generated
 * by the `docx` library, not just hand-crafted test input) can have other
 * ZIP entries first, pushing this marker past that window and causing a
 * real DOCX to be wrongly rejected. The file is already capped at 5 MB
 * (MAX_RESUME_FILE_SIZE) by the time this runs, so scanning it fully is
 * cheap.
 */
function looksLikeDocx(buf: Buffer): boolean {
  return buf.includes(Buffer.from('[Content_Types].xml', 'ascii'))
}

export function validateResumeFile(buffer: Buffer, filename: string): FileValidationResult {
  if (buffer.length === 0) return { valid: false, reason: 'EMPTY' }
  if (buffer.length > MAX_RESUME_FILE_SIZE) return { valid: false, reason: 'TOO_LARGE' }

  if (startsWith(buffer, PDF_MAGIC)) {
    return { valid: true, detectedType: 'pdf' }
  }

  const lowerName = filename.toLowerCase()
  if (startsWith(buffer, ZIP_MAGIC) && lowerName.endsWith('.docx') && looksLikeDocx(buffer)) {
    return { valid: true, detectedType: 'docx' }
  }

  return { valid: false, reason: 'UNSUPPORTED_TYPE' }
}
