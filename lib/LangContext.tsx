'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { i18n, Lang, Translations } from './i18n'

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: Translations }

const LangContext = createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  t: i18n.en,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('rr-lang') as Lang | null
    if (stored === 'en' || stored === 'fa') setLangState(stored)
  }, [])

  // Apply dir/lang whenever lang changes. Fonts are NOT set here anymore —
  // Vazirmatn is loaded once via the static Google Fonts <link> in
  // app/layout.tsx (so it's available immediately, no FOUC/dynamic-insert),
  // and globals.css's html[lang="fa"] selector repoints --font-display/
  // --font-body/--font-mono at --font-fa (Vazirmatn) the instant `lang` is
  // set below — every existing `fontFamily: var(--font-*)` usage in the
  // app picks it up automatically, no component needs to know about it.
  useEffect(() => {
    const html = document.documentElement
    html.lang = lang
    html.dir = lang === 'fa' ? 'rtl' : 'ltr'
    localStorage.setItem('rr-lang', lang)
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang: setLangState, t: i18n[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
