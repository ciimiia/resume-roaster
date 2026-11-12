'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { WORLD_COUNTRIES, type WorldRegionId } from '@/lib/worldMapData'
import { WORLD_CITIES } from '@/lib/worldCities'
import { buildExplorerQueryString, type StudyLevel, type Track } from '@/lib/explorerQuery'

const REGION_ORDER: WorldRegionId[] = ['north-america', 'latin-america', 'europe', 'africa', 'middle-east', 'asia', 'oceania']

// Rough bounding boxes in the full, uncropped projected space (x: 0-1000,
// y: 0-500) that WORLD_COUNTRIES' paths are drawn in — used to frame a
// region when it's clicked (center it, zoom to fit it with some margin).
// Not meant to be pixel-exact.
const REGION_BBOX: Record<WorldRegionId, { x1: number; y1: number; x2: number; y2: number }> = {
  'north-america': { x1: 28, y1: 42, x2: 361, y2: 236 },
  'latin-america': { x1: 167, y1: 158, x2: 403, y2: 406 },
  europe: { x1: 431, y1: 50, x2: 625, y2: 156 },
  africa: { x1: 444, y1: 144, x2: 644, y2: 347 },
  'middle-east': { x1: 569, y1: 133, x2: 675, y2: 217 },
  asia: { x1: 667, y1: 97, x2: 917, y2: 278 },
  oceania: { x1: 806, y1: 250, x2: 1000, y2: 381 },
}

// The fixed OUTER viewBox/window — what's visible at zoom=1, pan=(0,0).
// Content (WORLD_COUNTRIES' paths) spans the full "0 0 1000 500" projection;
// this window only shows a band of it (drops the mostly-empty Arctic/
// Antarctic area) by default, but panning while zoomed in can reveal the
// rest — the crop is just the starting view, not a hard limit on content.
const FULL_W = 1000
const FULL_H = 500
const MAP_CROP_TOP = 40
const MAP_CROP_HEIGHT = 330
const WIN_BOTTOM = MAP_CROP_TOP + MAP_CROP_HEIGHT
const MAP_VIEWBOX = `0 ${MAP_CROP_TOP} ${FULL_W} ${MAP_CROP_HEIGHT}`
const MIN_ZOOM = 1
const MAX_ZOOM = 8

function clampNum(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

// A pan offset this far out would show empty space beyond the content —
// clamp it back so the map never "runs out" under the cursor/finger.
function clampPan(pan: { x: number; y: number }, zoom: number) {
  return {
    x: clampNum(pan.x, FULL_W * (1 - zoom), 0),
    y: clampNum(pan.y, WIN_BOTTOM - FULL_H * zoom, MAP_CROP_TOP),
  }
}

const COUNTRIES_BY_REGION: Record<WorldRegionId, { iso: string; name: string }[]> = (() => {
  const map = {} as Record<WorldRegionId, { iso: string; name: string }[]>
  for (const r of REGION_ORDER) map[r] = []
  for (const c of WORLD_COUNTRIES) map[c.region].push({ iso: c.iso, name: c.name })
  for (const r of REGION_ORDER) map[r].sort((a, b) => a.name.localeCompare(b.name))
  return map
})()

// Keyed by the same `iso` the country buttons use, so "cities available for
// the currently selected countries" is a plain lookup — capitals/major hubs
// (tier 1) first, dataset order breaks ties.
const CITIES_BY_ISO: Record<string, { name: string; tier: 1 | 2 }[]> = (() => {
  const map: Record<string, { name: string; tier: 1 | 2 }[]> = {}
  for (const c of WORLD_CITIES) (map[c.iso] ??= []).push({ name: c.name, tier: c.tier })
  for (const iso of Object.keys(map)) map[iso].sort((a, b) => a.tier - b.tier)
  return map
})()

const ACCENT = 'var(--accent)'

export default function WorldMapPicker() {
  const { t } = useLang()
  const router = useRouter()

  const [track, setTrack] = useState<Track>('work')
  const [region, setRegion] = useState<WorldRegionId | null>(null)
  const [countries, setCountries] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [career, setCareer] = useState('')
  const [studyLevel, setStudyLevel] = useState<StudyLevel | ''>('')
  const [studyField, setStudyField] = useState('')

  const regionLabel = (r: WorldRegionId) => ({
    'north-america': t.xRegionNorthAmerica,
    'latin-america': t.xRegionLatinAmerica,
    europe: t.xRegionEurope,
    africa: t.xRegionAfrica,
    'middle-east': t.xRegionMiddleEast,
    asia: t.xRegionAsia,
    oceania: t.xRegionOceania,
  })[r]

  // Pan/zoom: a fixed outer <svg viewBox> (MAP_VIEWBOX) never changes — a
  // <g transform="translate(...) scale(...)"> inside it does the actual
  // panning/zooming, in the same coordinate units as the viewBox, which is
  // what lets wheel-zoom, drag-to-pan and "frame this region" all share one
  // simple (zoom, pan) state instead of three different mechanisms.
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number }; moved: boolean } | null>(null)
  // Below this many screen px of movement, a pointerdown→pointerup is a
  // click (select the country), not a drag — matters because calling
  // setPointerCapture retargets the browser's synthesized `click` event to
  // whatever element captured the pointer (the <svg>), not the <path>
  // actually under the cursor, which silently broke country selection the
  // moment the map was zoomed in enough for dragging to be possible at all.
  const DRAG_THRESHOLD_PX = 4

  const screenDeltaToViewBox = useCallback((dx: number, dy: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
    return { x: dx * (FULL_W / rect.width), y: dy * (MAP_CROP_HEIGHT / rect.height) }
  }, [])

  const zoomAround = useCallback((focal: { x: number; y: number }, newZoom: number) => {
    setZoom(z => {
      const k1 = clampNum(newZoom, MIN_ZOOM, MAX_ZOOM)
      setPan(p => {
        // Point under `focal` (in outer-window coords) stays fixed: solve
        // for the new pan given the same content-space point under it.
        const contentX = (focal.x - p.x) / z
        const contentY = (focal.y - p.y) / z
        return clampPan({ x: focal.x - contentX * k1, y: focal.y - contentY * k1 }, k1)
      })
      return k1
    })
  }, [])

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const focal = {
      x: (e.clientX - rect.left) * (FULL_W / rect.width),
      y: MAP_CROP_TOP + (e.clientY - rect.top) * (MAP_CROP_HEIGHT / rect.height),
    }
    zoomAround(focal, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (zoom <= MIN_ZOOM) return
    // No setPointerCapture here — only once movement proves it's a real
    // drag (see onPointerMove), so a plain click still reaches the path.
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: pan, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (!drag.moved) {
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (dist < DRAG_THRESHOLD_PX) return
      drag.moved = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const d = screenDeltaToViewBox(e.clientX - drag.startX, e.clientY - drag.startY)
    setPan(clampPan({ x: drag.startPan.x + d.x, y: drag.startPan.y + d.y }, zoom))
  }
  const endDrag = () => { dragRef.current = null; setDragging(false) }

  const windowCenter = { x: FULL_W / 2, y: MAP_CROP_TOP + MAP_CROP_HEIGHT / 2 }
  const zoomIn = () => zoomAround(windowCenter, zoom * 1.4)
  const zoomOut = () => zoomAround(windowCenter, zoom / 1.4)
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const frameRegion = (r: WorldRegionId) => {
    const b = REGION_BBOX[r]
    const w = b.x2 - b.x1
    const h = b.y2 - b.y1
    const k = clampNum(Math.min(FULL_W / w, MAP_CROP_HEIGHT / h) * 0.7, MIN_ZOOM, MAX_ZOOM)
    const centerX = (b.x1 + b.x2) / 2
    const centerY = (b.y1 + b.y2) / 2
    setZoom(k)
    setPan(clampPan({ x: windowCenter.x - centerX * k, y: windowCenter.y - centerY * k }, k))
  }

  const pickRegion = (r: WorldRegionId) => {
    setRegion(r)
    frameRegion(r)
  }

  const toggleCountry = (iso: string, countryRegion: WorldRegionId) => {
    if (countryRegion !== region) frameRegion(countryRegion)
    setRegion(countryRegion)
    setCountries(cs => {
      const next = cs.includes(iso) ? cs.filter(c => c !== iso) : [...cs, iso]
      // Deselecting a country drops any of its cities too, so `cities` never
      // holds a city whose country isn't actually selected any more.
      if (!next.includes(iso)) {
        const droppedNames = new Set((CITIES_BY_ISO[iso] ?? []).map(c => c.name))
        setCities(prev => prev.filter(name => !droppedNames.has(name)))
      }
      return next
    })
  }

  // Union of every selected country's cities — the picklist shown below the
  // country buttons. Selecting a city is an optional refinement, not
  // required to submit.
  const availableCities = countries.flatMap(iso => CITIES_BY_ISO[iso] ?? [])
  const toggleCity = (name: string) => {
    setCities(cs => (cs.includes(name) ? cs.filter(c => c !== name) : [...cs, name]))
  }

  const ready = countries.length > 0
  const ctaLabel = ready
    ? t.xCtaReady.replace('{n}', String(countries.length))
    : t.xCtaEmpty

  const submit = () => {
    if (!ready) return
    const qs = track === 'work'
      ? buildExplorerQueryString({ track: 'work', countries, cities, career })
      : buildExplorerQueryString({ track: 'study', countries, cities, level: studyLevel, field: studyField })
    router.push(`/${track === 'work' ? 'jobs' : 'universities'}?${qs}`)
  }

  return (
    <section id="explorer" style={{ position: 'relative', background: 'var(--bg)', padding: 'clamp(6px,0.8vw,12px) 0 clamp(14px,2vw,22px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 var(--gutter)', display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--ink)' }}>

        {/* Headline + track toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 999,
            background: 'var(--tint)', border: '1px solid var(--line-2)', color: ACCENT, fontSize: 11.5, fontWeight: 600,
          }}>
            {t.xBadge}
          </span>

          <div role="tablist" aria-label="Work or study" style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 999, padding: 3, gap: 4 }}>
            {(['work', 'study'] as Track[]).map(tr => (
              <button
                key={tr}
                type="button"
                role="tab"
                aria-selected={track === tr}
                onClick={() => setTrack(tr)}
                style={{
                  padding: '6px 16px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: track === tr ? ACCENT : 'transparent',
                  color: track === tr ? 'var(--accent-ink)' : 'var(--ink-mute)',
                }}
              >
                {tr === 'work' ? t.xTrackWork : t.xTrackStudy}
              </button>
            ))}
          </div>

          <h1 style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 700, lineHeight: 1.15, maxWidth: 680 }}>
            {track === 'work' ? t.xH1Work : t.xH1Study}
          </h1>
          <p style={{ margin: 0, maxWidth: 540, fontSize: 13.5, lineHeight: 1.45, color: 'var(--ink-mute)' }}>
            {track === 'work' ? t.xBodyWork : t.xBodyStudy}
          </p>
        </div>

        {/* Map + picker card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 20, padding: 'clamp(10px,1.4vw,16px)',
          boxShadow: 'var(--shadow-1)', border: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="map-picker-grid">
            {/* Map (decorative/pointer enhancement — same state driven by the real buttons below).
                Draggable/scroll-zoomable like any map UI; the +/-/reset buttons give a
                keyboard-reachable, discoverable equivalent to the same pan/zoom state. */}
            <div className="map-picker-visual" style={{
              position: 'relative', flex: '1 1 420px', minWidth: 280, aspectRatio: `1000 / ${MAP_CROP_HEIGHT}`,
              borderRadius: 14, overflow: 'hidden', background: 'var(--bg)',
            }}>
              <svg
                ref={svgRef}
                viewBox={MAP_VIEWBOX}
                aria-hidden="true"
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                onPointerCancel={endDrag}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  touchAction: 'none', cursor: dragging ? 'grabbing' : zoom > MIN_ZOOM ? 'grab' : 'default',
                }}
              >
                <g style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: dragging ? 'none' : 'transform .45s cubic-bezier(.16,1,.3,1)',
                }}>
                  {WORLD_COUNTRIES.map(c => {
                    const selected = countries.includes(c.iso)
                    const inActiveRegion = region === c.region
                    return (
                      <path
                        key={c.iso + c.name}
                        d={c.d}
                        fill={selected ? 'var(--map-selected)' : inActiveRegion ? 'var(--map-hover)' : 'var(--map-land)'}
                        stroke="var(--map-line)"
                        strokeWidth={0.6 / zoom}
                        strokeLinejoin="round"
                        onClick={() => toggleCountry(c.iso, c.region)}
                        style={{ cursor: 'pointer' }}
                      />
                    )
                  })}
                </g>
              </svg>

              <div style={{ position: 'absolute', bottom: 10, insetInlineEnd: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: '+', action: zoomIn, title: 'Zoom in' },
                  { label: '−', action: zoomOut, title: 'Zoom out' },
                  { label: '⟲', action: resetView, title: 'Reset view' },
                ].map(b => (
                  <button
                    key={b.title}
                    type="button"
                    onClick={b.action}
                    title={b.title}
                    aria-label={b.title}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line-2)',
                      background: 'var(--surface)', color: 'var(--ink)', fontSize: 16, lineHeight: 1,
                      display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-1)',
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Real buttons — regions, then countries of the active region. Always
                present (not map-only), so every selection is keyboard/SR reachable
                and works identically at phone width where the map itself is hidden
                via CSS (.map-picker-grid media query below). */}
            <div style={{ flex: '1 1 320px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }}>{t.xPickRegionPrompt}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REGION_ORDER.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => pickRegion(r)}
                      aria-pressed={region === r}
                      style={{
                        padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${region === r ? ACCENT : 'var(--line-2)'}`,
                        background: region === r ? 'var(--tint)' : 'var(--surface-2)',
                        color: region === r ? ACCENT : 'var(--ink-soft)',
                      }}
                    >
                      {regionLabel(r)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }}>{t.xCountriesLabel}</div>
                {region ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                    {COUNTRIES_BY_REGION[region].map(c => {
                      const selected = countries.includes(c.iso)
                      return (
                        <button
                          key={c.iso}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleCountry(c.iso, region)}
                          style={{
                            padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${selected ? ACCENT : 'var(--line-2)'}`,
                            background: selected ? ACCENT : 'var(--surface-2)',
                            color: selected ? 'var(--accent-ink)' : 'var(--ink-soft)',
                          }}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'var(--ink-faint)' }}>{t.xCountriesNone}</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 6 }}>{t.xCitiesLabel}</div>
                {countries.length === 0 ? (
                  <div style={{ fontSize: 13.5, color: 'var(--ink-faint)' }}>{t.xCitiesNone}</div>
                ) : availableCities.length === 0 ? (
                  <div style={{ fontSize: 13.5, color: 'var(--ink-faint)' }}>{t.xCitiesUnavailable}</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                    {availableCities.map(c => {
                      const selected = cities.includes(c.name)
                      return (
                        <button
                          key={c.name}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleCity(c.name)}
                          style={{
                            padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${selected ? ACCENT : 'var(--line-2)'}`,
                            background: selected ? ACCENT : 'var(--surface-2)',
                            color: selected ? 'var(--accent-ink)' : 'var(--ink-soft)',
                          }}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {track === 'work' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 600 }}>{t.xCareerLabel}</span>
                  <input
                    type="text"
                    value={career}
                    onChange={e => setCareer(e.target.value)}
                    placeholder={t.xCareerPlaceholder}
                    style={{
                      padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line-2)',
                      background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 14,
                    }}
                  />
                </label>
              ) : (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 600 }}>{t.xStudyLevelLabel}</span>
                    <select
                      value={studyLevel}
                      onChange={e => setStudyLevel(e.target.value as StudyLevel | '')}
                      style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 14 }}
                    >
                      <option value="">—</option>
                      <option value="bachelor">{t.xStudyLevelBachelor}</option>
                      <option value="master">{t.xStudyLevelMaster}</option>
                      <option value="phd">{t.xStudyLevelPhd}</option>
                      <option value="other">{t.xStudyLevelOther}</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 600 }}>{t.xStudyFieldLabel}</span>
                    <input
                      type="text"
                      value={studyField}
                      onChange={e => setStudyField(e.target.value)}
                      placeholder={t.xStudyFieldPlaceholder}
                      style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 14 }}
                    />
                  </label>
                </>
              )}

              <button
                type="button"
                disabled={!ready}
                onClick={submit}
                style={{
                  marginTop: 4, padding: '12px 20px', border: 'none', borderRadius: 14,
                  fontSize: 14.5, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed',
                  background: ready ? ACCENT : 'var(--surface-2)', color: ready ? 'var(--accent-ink)' : 'var(--ink-faint)',
                }}
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
