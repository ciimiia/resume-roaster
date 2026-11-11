'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { WORLD_COUNTRIES, type WorldRegionId } from '@/lib/worldMapData'
import { buildExplorerQueryString, type StudyLevel, type Track } from '@/lib/explorerQuery'

const REGION_ORDER: WorldRegionId[] = ['north-america', 'latin-america', 'europe', 'africa', 'middle-east', 'asia', 'oceania']

// Rough bounding boxes in the same projected space as WORLD_COUNTRIES
// (x: 0-1000, y: 0-500) — used only to pick a CSS transform-origin for the
// "zoom toward this region" effect; not meant to be pixel-exact.
const REGION_BBOX_CENTER: Record<WorldRegionId, { x: number; y: number }> = {
  'north-america': { x: 19, y: 28 },
  'latin-america': { x: 28, y: 56 },
  europe: { x: 53, y: 21 },
  africa: { x: 54, y: 49 },
  'middle-east': { x: 62, y: 35 },
  asia: { x: 79, y: 38 },
  oceania: { x: 90, y: 65 },
}

// Cropped viewBox — drops the mostly-empty Arctic/Antarctic bands from the
// full "0 0 1000 500" projection so the map reads wider/shorter.
const MAP_CROP_TOP = 20
const MAP_CROP_HEIGHT = 400
const MAP_VIEWBOX = `0 ${MAP_CROP_TOP} 1000 ${MAP_CROP_HEIGHT}`

const COUNTRIES_BY_REGION: Record<WorldRegionId, { iso: string; name: string }[]> = (() => {
  const map = {} as Record<WorldRegionId, { iso: string; name: string }[]>
  for (const r of REGION_ORDER) map[r] = []
  for (const c of WORLD_COUNTRIES) map[c.region].push({ iso: c.iso, name: c.name })
  for (const r of REGION_ORDER) map[r].sort((a, b) => a.name.localeCompare(b.name))
  return map
})()

const ACCENT = 'var(--accent)'

export default function WorldMapPicker() {
  const { t } = useLang()
  const router = useRouter()

  const [track, setTrack] = useState<Track>('work')
  const [region, setRegion] = useState<WorldRegionId | null>(null)
  const [countries, setCountries] = useState<string[]>([])
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

  const toggleCountry = (iso: string, countryRegion: WorldRegionId) => {
    setRegion(countryRegion)
    setCountries(cs => (cs.includes(iso) ? cs.filter(c => c !== iso) : [...cs, iso]))
  }

  const pickRegion = (r: WorldRegionId) => setRegion(r)

  const mapTransform = useMemo(() => {
    if (!region) return { origin: '50% 50%', scale: 1 }
    const c = REGION_BBOX_CENTER[region]
    return { origin: `${c.x}% ${c.y}%`, scale: 2.1 }
  }, [region])

  const ready = countries.length > 0
  const ctaLabel = ready
    ? t.xCtaReady.replace('{n}', String(countries.length)).replace('{countryWord}', countries.length === 1 ? t.xCountryWordOne : t.xCountryWordMany)
    : t.xCtaEmpty

  const submit = () => {
    if (!ready) return
    const qs = track === 'work'
      ? buildExplorerQueryString({ track: 'work', countries, career })
      : buildExplorerQueryString({ track: 'study', countries, level: studyLevel, field: studyField })
    router.push(`/${track === 'work' ? 'jobs' : 'universities'}?${qs}`)
  }

  return (
    <section id="explorer" style={{ position: 'relative', background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)', padding: 'clamp(24px,4vw,44px) 0 clamp(36px,4vw,56px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 var(--gutter)', display: 'flex', flexDirection: 'column', gap: 28, color: 'var(--ink)' }}>

        {/* Headline + track toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999,
            background: 'var(--tint)', border: '1px solid var(--line-2)', color: ACCENT, fontSize: 12.5, fontWeight: 600,
          }}>
            {t.xBadge}
          </span>

          <div role="tablist" aria-label="Work or study" style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 999, padding: 4, gap: 4 }}>
            {(['work', 'study'] as Track[]).map(tr => (
              <button
                key={tr}
                type="button"
                role="tab"
                aria-selected={track === tr}
                onClick={() => setTrack(tr)}
                style={{
                  padding: '9px 20px', borderRadius: 999, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  background: track === tr ? ACCENT : 'transparent',
                  color: track === tr ? 'var(--accent-ink)' : 'var(--ink-mute)',
                }}
              >
                {tr === 'work' ? t.xTrackWork : t.xTrackStudy}
              </button>
            ))}
          </div>

          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.4vw,34px)', fontWeight: 700, lineHeight: 1.15, maxWidth: 680 }}>
            {track === 'work' ? t.xH1Work : t.xH1Study}
          </h1>
          <p style={{ margin: 0, maxWidth: 540, fontSize: 14.5, lineHeight: 1.55, color: 'var(--ink-mute)' }}>
            {track === 'work' ? t.xBodyWork : t.xBodyStudy}
          </p>
        </div>

        {/* Map + picker card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 24, padding: 'clamp(14px,2vw,22px)',
          boxShadow: 'var(--shadow-1)', border: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }} className="map-picker-grid">
            {/* Map (decorative/pointer enhancement — same state driven by the real buttons below) */}
            <div className="map-picker-visual" style={{
              position: 'relative', flex: '1 1 420px', minWidth: 280, aspectRatio: `1000 / ${MAP_CROP_HEIGHT}`,
              borderRadius: 16, overflow: 'hidden', background: 'var(--bg)',
            }}>
              <svg
                viewBox={MAP_VIEWBOX}
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  transformOrigin: mapTransform.origin, transform: `scale(${mapTransform.scale})`,
                  transition: 'transform .5s cubic-bezier(.16,1,.3,1)',
                }}
              >
                {WORLD_COUNTRIES.map(c => {
                  const selected = countries.includes(c.iso)
                  const inActiveRegion = region === c.region
                  return (
                    <path
                      key={c.iso + c.name}
                      d={c.d}
                      fill={selected ? ACCENT : inActiveRegion ? 'var(--surface-3)' : 'var(--surface-2)'}
                      stroke="var(--line-2)"
                      strokeWidth={0.6}
                      strokeLinejoin="round"
                      onClick={() => toggleCountry(c.iso, c.region)}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                })}
              </svg>
            </div>

            {/* Real buttons — regions, then countries of the active region. Always
                present (not map-only), so every selection is keyboard/SR reachable
                and works identically at phone width where the map itself is hidden
                via CSS (.map-picker-grid media query below). */}
            <div style={{ flex: '1 1 320px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 8 }}>{t.xPickRegionPrompt}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {REGION_ORDER.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => pickRegion(r)}
                      aria-pressed={region === r}
                      style={{
                        padding: '8px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
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
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 8 }}>{t.xCountriesLabel}</div>
                {region ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
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
