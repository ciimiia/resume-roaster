/**
 * Static check (no DB, no network) confirming the landing-map-refactor's
 * world-map picker has zero external-network dependency at runtime:
 *  - the map-related source files never call fetch()/XHR against a remote
 *    host (the map data is a locally bundled static module)
 *  - no map/geo runtime library (d3-geo, topojson-client, maplibre-gl, …)
 *    was added as a dependency — confirms the "bundled locally, not a
 *    client-side runtime library" choice actually holds, not just in intent
 *
 * Run with: npx tsx scripts/test-mapNoExternalNetwork.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'

let failures = 0
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures++
}

const MAP_FILES = [
  'components/WorldMapPicker.tsx',
  'lib/worldMapData.ts',
  'lib/explorerQuery.ts',
]

const FORBIDDEN_NETWORK_PATTERNS = [/fetch\(\s*['"]https?:/, /new\s+XMLHttpRequest/, /navigator\.sendBeacon/]

for (const path of MAP_FILES) {
  const src = readFileSync(join(__dirname, '..', path), 'utf8')
  check(`${path}: no external fetch/XHR call`, !FORBIDDEN_NETWORK_PATTERNS.some(re => re.test(src)))
}

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'))
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
const FORBIDDEN_RUNTIME_LIBS = ['d3-geo', 'd3', 'topojson', 'topojson-client', 'maplibre-gl', 'mapbox-gl', 'leaflet']
for (const lib of FORBIDDEN_RUNTIME_LIBS) {
  check(`package.json: "${lib}" not added as a dependency`, !(lib in allDeps))
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed')
