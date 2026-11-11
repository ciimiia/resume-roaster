'use client'

import { useLang } from '@/lib/LangContext'
import { containerStyle } from '@/lib/styles'
import type { LegalSection } from './legalContent'

/**
 * Shared renderer for /privacy and /terms — both pages are identical in
 * structure, just different content (lib/legalContent.ts). The "not legal
 * advice" banner is part of this shared renderer specifically so it can't
 * be dropped from one page but not the other by accident.
 */
export default function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  const { lang } = useLang()
  const isLawyerBannerFa = lang === 'fa'

  return (
    <div style={{ minHeight: '100vh', padding: '0 var(--gutter) 100px' }}>
      <div style={containerStyle(760)}>
        <div style={{ padding: 'var(--sp-9) 0 var(--sp-6)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-2xl)', marginBottom: 'var(--sp-4)' }}>
            {title}
          </h1>
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--r-md)', fontSize: 13, lineHeight: 1.6,
            background: 'color-mix(in srgb, var(--roast) 10%, var(--surface-2))',
            border: '1px solid color-mix(in srgb, var(--roast) 30%, transparent)',
            color: 'var(--roast)',
          }}>
            {isLawyerBannerFa
              ? '⚠️ این صفحه پیش‌نویسه و مشاورهٔ حقوقی نیست. قبل از راه‌اندازی رسمی، باید یک وکیل این محتوا رو بررسی کنه — به‌خصوص برای کاربران اتحادیهٔ اروپا (GDPR).'
              : '⚠️ This page is a draft, not legal advice. A lawyer must review this content before launch — especially for EU users (GDPR).'}
          </div>
        </div>

        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 'var(--sp-7)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 'var(--sp-3)' }}>{s.heading}</h2>
            {s.body.map((p, j) => (
              <p key={j} style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-soft)', marginBottom: 'var(--sp-3)' }}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
