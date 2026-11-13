/**
 * Greps components/app/lib for a font-family set to something other than a
 * --font-* token (or `inherit`, or a bare generic keyword like sans-serif),
 * outside globals.css (the one place a font family is allowed to be
 * defined). Same allowlist-with-reason style as test-noHardcodedColors.ts.
 *
 * Run with: npx tsx scripts/test-noHardcodedFonts.ts
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..')
const SCAN_DIRS = ['app', 'components', 'lib']
const EXTENSIONS = ['.tsx', '.ts', '.css']

// Matches fontFamily: '...'/"...", CSS font-family: ...;, canvas ctx.font
// shorthand strings (which embed the family name, e.g. '700 24px "X", sans-serif'),
// and the SVG XML attribute form font-family="..." (no colon/semicolon —
// found in app/api/cron/generate-post/route.ts's inline SVG cover image).
const FONT_DECL_RE = /fontFamily:\s*(['"`])((?:(?!\1).)*)\1|font-family:\s*([^;"]+);|font-family="([^"]*)"|ctx\.font\s*=\s*(['"])((?:(?!\5).)*)\5/g

// A declaration is fine as-is if its value is one of these — a token
// reference, `inherit`, or nothing but generic CSS font keywords.
const GENERIC_ONLY_RE = /^[\s,]*(inherit|system-ui|-apple-system|sans-serif|serif|monospace|ui-monospace|ui-sans-serif|ui-serif)[\s,]*$/i

function isCompliant(value: string): boolean {
  if (value.includes('var(--font')) return true
  // Strip any px-size/weight prefix a canvas ctx.font string carries
  // (e.g. '700 24px ...') before checking what's left.
  const familyPart = value.replace(/^[\d.]+(px|pt|em|rem)?\s+/, '').replace(/^(italic|bold|normal|\d+)\s+[\d.]+(px|pt|em|rem)\s+/, '')
  return GENERIC_ONLY_RE.test(familyPart)
}

// file -> reason this file is allowed to hardcode a font family.
const ALLOWLIST: Record<string, string> = {
  'lib/tailoring/pdf/templates.ts': "PDF export — embeds Vazirmatn directly (lib/tailoring/pdf/fonts.ts), covers both EN and FA PDF text by design, independent of the live app's font tokens",
  'lib/tailoring/pdf/fonts.ts': "Defines the embedded Vazirmatn @font-face rules the PDF templates use — this IS the font, not a reference to one",
  'app/opengraph-image.tsx': 'Static social-share image — system font stack only, no theme context when rendered',
  'app/api/cron/generate-post/route.ts': 'Generates a static blog-post cover image (SVG) — fixed by design, same as the OG image',
  'components/Results.tsx': 'Canvas-drawn shareable result image — canvas fillText can\'t read CSS custom properties, so it hardcodes the live app fonts (Plus Jakarta Sans/Space Mono) directly; Hanken Grotesk stays for one muted label to match the builder/Workspace preview-pane convention',
  'components/builder/BuilderApp.tsx': 'Resume PREVIEW PANE — a mock printed page (Hanken Grotesk, looks like a real résumé), not themed app chrome',
  'components/Workspace.tsx': 'SAMPLE_RESUME preview mockup — same "looks like paper" reasoning as the builder preview',
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full).replace(/\\/g, '/')
    if (entry === 'node_modules' || entry === '.next') continue
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, out)
    } else if (EXTENSIONS.includes('.' + entry.split('.').pop())) {
      if (rel === 'app/globals.css') continue
      if (rel === 'lib/worldMapData.ts') continue
      out.push(full)
    }
  }
  return out
}

let failures = 0
let flaggedUnlisted = 0

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    const src = readFileSync(file, 'utf8')
    const nonCompliant: string[] = []
    let m: RegExpExecArray | null
    FONT_DECL_RE.lastIndex = 0
    while ((m = FONT_DECL_RE.exec(src))) {
      const value = m[2] ?? m[3] ?? m[4] ?? m[6] ?? ''
      if (!isCompliant(value)) nonCompliant.push(value.trim())
    }
    if (nonCompliant.length === 0) continue

    if (rel in ALLOWLIST) {
      console.log(`ALLOWLISTED — ${rel}: ${nonCompliant.length} font-family literal(s) — ${ALLOWLIST[rel]}`)
    } else {
      console.log(`FAIL — ${rel}: ${nonCompliant.length} unlisted hardcoded font-family literal(s): ${[...new Set(nonCompliant)].slice(0, 5).join(' | ')}`)
      failures++
      flaggedUnlisted++
    }
  }
}

console.log(`\n${flaggedUnlisted} file(s) with unlisted hardcoded fonts.`)
if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exit(1)
}
console.log('All checks passed — every hardcoded font-family literal is on the allowlist above, with a reason.')
