'use client'

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
 * Three entry paths into the WORK track (upload resume / import from
 * LinkedIn / "I'm a student" → switch to STUDY), plus the roast feature
 * demoted to a secondary card, per the landing-map-refactor brief.
 *
 * "Import from LinkedIn" never fetches a LinkedIn URL or scrapes a profile —
 * LinkedIn's terms don't allow that without their official partner API,
 * which this app doesn't have. It's instructions to export your own profile
 * as a PDF (LinkedIn's own "Save to PDF" feature) and reuses the existing
 * resume upload + parse flow at /profile unchanged — no new backend code.
 */
export default function EntryPaths({ onStartRoast }: { onStartRoast: () => void }) {
  const { t } = useLang()

  return (
    <section style={{ background: 'var(--bg)', maxWidth: '100%', margin: 0, padding: '0 0 clamp(32px,4vw,52px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 var(--gutter)' }}>
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
          <ol style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-mute)' }}>
            <li>{t.xEntryLinkedinStep1}</li>
            <li>{t.xEntryLinkedinStep2}</li>
          </ol>
          <Link href="/profile" style={{
            marginTop: 'auto', alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 11,
            background: ACCENT, color: 'var(--accent-ink)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
          }}>
            {t.xEntryLinkedinBtn}
          </Link>
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
      </div>
    </section>
  )
}
