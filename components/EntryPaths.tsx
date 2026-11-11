'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/LangContext'

const ACCENT = 'var(--accent)'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: '1 1 260px', minWidth: 240, background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {children}
    </div>
  )
}

/**
 * Three entry paths into the WORK track (upload resume / paste LinkedIn /
 * "I'm a student" → switch to STUDY), plus the roast feature demoted to a
 * secondary card, per the landing-map-refactor brief.
 *
 * LinkedIn paste is UI-only this phase — it captures a URL and shows an
 * honest "not supported yet" message. There is no LinkedIn fetching or
 * parsing here: LinkedIn's terms don't allow scraping profile pages without
 * their official partner API, which this app doesn't have, so building real
 * LinkedIn import is out of scope, not just deferred for time.
 */
export default function EntryPaths({ onStartRoast }: { onStartRoast: () => void }) {
  const { t } = useLang()
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [linkedinSubmitted, setLinkedinSubmitted] = useState(false)

  const submitLinkedin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkedinUrl.trim()) return
    setLinkedinSubmitted(true)
  }

  return (
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 var(--gutter) clamp(32px,4vw,52px)' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{t.xEntryUploadTitle}</h3>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-mute)' }}>{t.xEntryUploadBody}</p>
          <Link href="/profile" style={{
            marginTop: 'auto', alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 11,
            background: ACCENT, color: 'var(--accent-ink)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
          }}>
            {t.xEntryUploadBtn}
          </Link>
        </Card>

        <Card>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{t.xEntryLinkedinTitle}</h3>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-mute)' }}>{t.xEntryLinkedinBody}</p>
          {linkedinSubmitted ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--accent-2)' }}>
              LinkedIn import isn&apos;t available yet — please use &quot;{t.xEntryUploadTitle}&quot; instead.
            </p>
          ) : (
            <form onSubmit={submitLinkedin} style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder={t.xEntryLinkedinPlaceholder}
                style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line-2)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13.5 }}
              />
              <button type="submit" style={{
                padding: '9px 16px', borderRadius: 10, border: 'none', background: ACCENT, color: 'var(--accent-ink)',
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {t.xEntryLinkedinBtn}
              </button>
            </form>
          )}
        </Card>

        <Card>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{t.xEntryStudentTitle}</h3>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-mute)' }}>{t.xEntryStudentBody}</p>
          <a href="#explorer" style={{
            marginTop: 'auto', alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 11,
            border: '1px solid var(--line-2)', color: 'var(--ink)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
          }}>
            {t.xEntryStudentBtn}
          </a>
        </Card>

        <Card>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{t.xRoastCardTitle}</h3>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-mute)' }}>{t.xRoastCardBody}</p>
          <button type="button" onClick={onStartRoast} style={{
            marginTop: 'auto', alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 11,
            border: 'none', background: 'var(--surface-3)', color: 'var(--ink)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          }}>
            {t.xRoastCardBtn}
          </button>
        </Card>
      </div>
    </section>
  )
}
