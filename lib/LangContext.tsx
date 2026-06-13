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

  // Apply dir/lang/fonts whenever lang changes
  useEffect(() => {
    const html = document.documentElement
    if (lang === 'fa') {
      html.lang = 'fa'
      html.dir = 'rtl'
      // Inject Vazirmatn once
      if (!document.getElementById('vazirmatn-font')) {
        const lp = document.createElement('link')
        lp.id = 'vazirmatn-font'
        lp.rel = 'preconnect'
        lp.href = 'https://fonts.googleapis.com'
        document.head.appendChild(lp)
        const lp2 = document.createElement('link')
        lp2.rel = 'preconnect'
        lp2.href = 'https://fonts.gstatic.com'
        lp2.crossOrigin = 'anonymous'
        document.head.appendChild(lp2)
        const link = document.createElement('link')
        link.id = 'vazirmatn-font'
        link.rel = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap'
        document.head.appendChild(link)
      }
      html.style.setProperty('--font-display', "'Vazirmatn', system-ui, sans-serif")
      html.style.setProperty('--font-body',    "'Vazirmatn', system-ui, sans-serif")
      html.style.setProperty('--font-mono',    "'Vazirmatn', ui-monospace, monospace")
    } else {
      html.lang = 'en'
      html.dir = 'ltr'
      html.style.setProperty('--font-display', "'Space Grotesk', system-ui, sans-serif")
      html.style.setProperty('--font-body',    "'Hanken Grotesk', system-ui, sans-serif")
      html.style.setProperty('--font-mono',    "'Space Mono', ui-monospace, monospace")
    }
    localStorage.setItem('rr-lang', lang)
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang: setLangState, t: i18n[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
