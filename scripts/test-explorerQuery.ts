/**
 * Pure unit test for lib/explorerQuery.ts's URL query round-trip (build →
 * parse) — no DB, no network. Run with: npx tsx scripts/test-explorerQuery.ts
 */
import { buildExplorerQueryString, parseExplorerQuery, type ExplorerQuery } from '../lib/explorerQuery'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

function roundTrip(q: ExplorerQuery) {
  return parseExplorerQuery(new URLSearchParams(buildExplorerQueryString(q)))
}

// --- work track round-trip ---
{
  const q: ExplorerQuery = { track: 'work', countries: ['US', 'DE', 'CA'], career: 'Software Engineer' }
  const back = roundTrip(q)
  check('work: track round-trips', back.track === 'work')
  check('work: countries round-trip in order', JSON.stringify(back.countries) === JSON.stringify(['US', 'DE', 'CA']))
  check('work: career round-trips', back.track === 'work' && back.career === 'Software Engineer')
}

// --- study track round-trip ---
{
  const q: ExplorerQuery = { track: 'study', countries: ['NL', 'DE'], level: 'master', field: 'Computer Science' }
  const back = roundTrip(q)
  check('study: track round-trips', back.track === 'study')
  check('study: level round-trips', back.track === 'study' && back.level === 'master')
  check('study: field round-trips', back.track === 'study' && back.field === 'Computer Science')
}

// --- empty selection ---
{
  const q: ExplorerQuery = { track: 'work', countries: [], career: '' }
  const back = roundTrip(q)
  check('empty: countries is []', back.countries.length === 0)
  check('empty: career is empty string', back.track === 'work' && back.career === '')
}

// --- malformed / hostile input never throws, degrades safely ---
{
  const params = new URLSearchParams('track=study&countries=us, DE ,xx,123,toolong,&level=bogus&field=<script>')
  const parsed = parseExplorerQuery(params)
  check('malformed: lowercase iso codes are uppercased', parsed.countries.includes('US') && parsed.countries.includes('DE'))
  check('malformed: non-2-letter junk is dropped', !parsed.countries.includes('123') && !parsed.countries.includes('TOOLONG'))
  check('malformed: unknown level falls back to empty', parsed.track === 'study' && parsed.level === '')
  check('malformed: field is passed through as plain text (caller must escape on render)', parsed.track === 'study' && parsed.field === '<script>')
}

// --- missing track defaults to work ---
{
  const parsed = parseExplorerQuery(new URLSearchParams(''))
  check('missing track defaults to work', parsed.track === 'work')
  check('missing countries is []', parsed.countries.length === 0)
}

// --- duplicate countries are deduped ---
{
  const parsed = parseExplorerQuery(new URLSearchParams('track=work&countries=US,us,US'))
  check('duplicate countries deduped', parsed.countries.length === 1 && parsed.countries[0] === 'US')
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed')
