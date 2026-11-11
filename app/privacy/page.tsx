'use client'

import { useLang } from '@/lib/LangContext'
import { getPrivacySections } from '@/lib/legalContent'
import LegalPage from '@/lib/legalPageShared'

export default function PrivacyPage() {
  const { lang } = useLang()
  return <LegalPage title={lang === 'fa' ? 'سیاست حفظ حریم خصوصی' : 'Privacy Policy'} sections={getPrivacySections(lang)} />
}
