/**
 * Greps components/app/lib for hex colors, rgb()/hsl() literals, and the
 * pre-unification roast/coach/intl CSS custom properties, outside
 * globals.css (the one place color is allowed to be defined). Anything
 * found that isn't on the allowlist below is a real regression — a
 * hardcoded color bypasses the token system, which is exactly how the
 * landing page's unreadable-text bug happened in the first place.
 *
 * Run with: npx tsx scripts/test-noHardcodedColors.ts
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..')
const SCAN_DIRS = ['app', 'components', 'lib']
const EXTENSIONS = ['.tsx', '.ts', '.css']
const COLOR_RE = /#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g
const LEGACY_VAR_RE = /var\(--(roast|coach|intl)(?:-2)?\)/g

// Every (file, matched-string) pair here is an intentional exception, with
// why it's allowed to use a fixed color instead of a token. Grouped by
// reason so a new false positive is easy to triage.
const ALLOWLIST: { file: string; reason: string }[] = [
  // Printed/exported documents must look the same regardless of the
  // viewer's app theme (a résumé PDF, a print-to-PDF page, an og:image) —
  // there's no "viewer" to theme for, it's a static artifact.
  { file: 'lib/tailoring/pdf/templates.ts', reason: 'PDF export template — a fixed, printable document' },
  { file: 'app/opengraph-image.tsx', reason: 'Static social-share image — no theme context when rendered' },
  { file: 'app/api/cron/generate-post/route.ts', reason: 'Generates a static blog-post cover image (SVG)' },
  { file: 'app/builder/print.css', reason: 'Browser print stylesheet for the resume builder — printed page, not themed UI' },
  { file: 'components/builder/BuilderApp.tsx', reason: 'Contains the resume PREVIEW PANE — a mock printed page (white paper/black ink), not themed app chrome' },
  { file: 'components/Workspace.tsx', reason: 'Contains the SAMPLE_RESUME preview mockup — same "looks like paper" reasoning as the builder preview' },
  // A canvas-drawn, downloadable share image — canvas fillStyle can't read
  // CSS custom properties, and the image is meant to reflect the roast/
  // coach/intl mode's identity regardless of the viewer's own theme.
  { file: 'components/Results.tsx', reason: 'Canvas-drawn shareable result image + its preview frame — fixed by design, not CSS' },
  // Small, deliberately fixed score/grade/tag badges — explicitly allowed
  // ("roast/coach/intl mode accents stay only as small accents (badges,
  // score rings)") and conceptually the same pattern for grade letters and
  // blog tags.
  { file: 'lib/data.ts', reason: 'MODES config — the mode-selector cards\' own small accent, explicitly kept' },
  { file: 'app/dashboard/DashboardClient.tsx', reason: 'GRADE_COLORS badge map — same "small accent" pattern as score rings' },
  { file: 'app/jobs/JobsClient.tsx', reason: 'Match-score tier color function — same "small accent" pattern as score rings' },
  { file: 'components/blog/BlogIndex.tsx', reason: 'Blog tag-color badges — small, decorative, not page chrome' },
  { file: 'components/blog/PostContent.tsx', reason: 'Blog tag-color badges — same as BlogIndex' },
  // Purely decorative, not text/contrast-relevant: a gloss highlight line,
  // macOS-style window dots, placeholder avatar circles.
  { file: 'components/ui/Button.tsx', reason: 'Fixed white gloss-highlight inset shadow — decorative, not text' },
  { file: 'components/ui/Logo.tsx', reason: 'Fixed white pill behind the logo PNG in dark mode — the wordmark\'s ink color is baked into the image, not a CSS token' },
  { file: 'components/Landing.tsx', reason: 'StatTicker avatar-dot colors + macOS traffic-light dots — decorative icons' },
]
const ALLOWED_FILES = new Set(ALLOWLIST.map(a => a.file))

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
      if (rel.endsWith('.generated.ts') || rel === 'lib/worldMapData.ts') continue // generated data, not color literals
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
    const colorMatches = src.match(COLOR_RE) ?? []
    const legacyMatches = src.match(LEGACY_VAR_RE) ?? []

    if (legacyMatches.length > 0) {
      console.log(`FAIL — ${rel}: still references pre-unification var(--roast/--coach/--intl): ${[...new Set(legacyMatches)].join(', ')}`)
      failures++
      continue
    }
    if (colorMatches.length === 0) continue

    if (ALLOWED_FILES.has(rel)) {
      console.log(`ALLOWLISTED — ${rel}: ${colorMatches.length} color literal(s) — ${ALLOWLIST.find(a => a.file === rel)!.reason}`)
    } else {
      console.log(`FAIL — ${rel}: ${colorMatches.length} unlisted hardcoded color literal(s): ${[...new Set(colorMatches)].slice(0, 5).join(', ')}`)
      failures++
      flaggedUnlisted++
    }
  }
}

console.log(`\n${flaggedUnlisted} file(s) with unlisted hardcoded colors.`)
if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exit(1)
}
console.log('All checks passed — every hardcoded color literal is on the allowlist above, with a reason.')
