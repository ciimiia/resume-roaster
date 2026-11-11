'use client'

import { useLang } from '@/lib/LangContext'
import { getTermsSections } from '@/lib/legalContent'
import LegalPage from '@/lib/legalPageShared'

export default function TermsPage() {
  const { lang } = useLang()
  return <LegalPage title={lang === 'fa' ? 'شرایط استفاده از خدمات' : 'Terms of Service'} sections={getTermsSections(lang)} />
}
