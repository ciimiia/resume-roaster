/**
 * Parses the real DAYLIGHT (:root) and NIGHT (html[data-color-theme="dark"])
 * token blocks straight out of app/globals.css — not a copy of the values —
 * and asserts WCAG AA contrast for every pair that actually renders text or
 * a meaningful non-text UI element against another token. If someone edits
 * the hex values at the top of globals.css later, this test re-checks the
 * values that are actually live, not a snapshot.
 *
 * Run with: npx tsx scripts/test-contrastTokens.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'

let failures = 0
function check(label: string, ratio: number, min: number) {
  const pass = ratio >= min
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${label}: ${ratio.toFixed(2)}:1 (need ${min}:1)`)
  if (!pass) failures++
}

function relLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(hexA: string, hexB: string): number {
  const [l1, l2] = [relLuminance(hexA), relLuminance(hexB)].sort((a, b) => b - a)
  return (l1 + 0.05) / (l2 + 0.05)
}

function extractBlock(css: string, selector: string): string {
  const idx = css.indexOf(selector)
  if (idx === -1) throw new Error(`Selector not found in globals.css: ${selector}`)
  const open = css.indexOf('{', idx)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

function extractTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  const re = /--([a-z0-9-]+):\s*([^;]+);/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(block))) {
    const name = m[1].trim()
    const value = m[2].trim()
    if (/^#[0-9A-Fa-f]{3,8}$/.test(value)) tokens[name] = value
  }
  return tokens
}

const cssPath = join(__dirname, '..', 'app', 'globals.css')
// Strip /* ... */ comments first — several explain these exact selectors in
// prose, which would otherwise be found by indexOf() before the real rule.
const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const DAY = extractTokens(extractBlock(css, ':root {'))
const NIGHT = extractTokens(extractBlock(css, 'html[data-color-theme="dark"]'))

function need(tokens: Record<string, string>, name: string): string {
  const v = tokens[name]
  if (!v) throw new Error(`Token --${name} not found as a hex value in this block`)
  return v
}

function runVariant(name: string, t: Record<string, string>) {
  console.log(`\n--- ${name} ---`)
  check(`${name} ink/bg`, contrast(need(t, 'ink'), need(t, 'bg')), 4.5)
  check(`${name} ink/surface`, contrast(need(t, 'ink'), need(t, 'surface')), 4.5)
  check(`${name} ink-mute/bg`, contrast(need(t, 'ink-mute'), need(t, 'bg')), 4.5)
  check(`${name} ink-mute/surface`, contrast(need(t, 'ink-mute'), need(t, 'surface')), 4.5)
  check(`${name} accent-ink/accent`, contrast(need(t, 'accent-ink'), need(t, 'accent')), 4.5)
  check(`${name} accent-text/bg`, contrast(need(t, 'accent-text'), need(t, 'bg')), 4.5)
  check(`${name} accent-text/surface`, contrast(need(t, 'accent-text'), need(t, 'surface')), 4.5)
  check(`${name} secondary/bg`, contrast(need(t, 'secondary'), need(t, 'bg')), 4.5)
  check(`${name} map-land/bg (non-text)`, contrast(need(t, 'map-land'), need(t, 'bg')), 3.0)
  check(`${name} map-selected/map-land (non-text)`, contrast(need(t, 'map-selected'), need(t, 'map-land')), 3.0)
  // Bonus — not in the spec's required list, but these are real text colors
  // used throughout the app, so worth catching a regression here too.
  check(`${name} danger/bg (bonus check)`, contrast(need(t, 'danger'), need(t, 'bg')), 4.5)
  check(`${name} danger/surface (bonus check)`, contrast(need(t, 'danger'), need(t, 'surface')), 4.5)
  check(`${name} danger-ink/danger (bonus check)`, contrast(need(t, 'danger-ink'), need(t, 'danger')), 4.5)
  check(`${name} secondary-ink/secondary (bonus check)`, contrast(need(t, 'secondary-ink'), need(t, 'secondary')), 4.5)
}

runVariant('DAYLIGHT', DAY)
runVariant('NIGHT', NIGHT)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed')
