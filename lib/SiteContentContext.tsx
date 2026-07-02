'use client'

import { createContext, useContext } from 'react'

export interface LocaleString { en: string; fa: string }

export interface SiteContent {
  // Landing
  heroH1a?: LocaleString
  heroH1b?: LocaleString
  heroH1c?: LocaleString
  heroBody?: LocaleString
  heroCta1?: LocaleString
  heroCta2?: LocaleString
  ctaH2?: LocaleString
  ctaBody?: LocaleString
  // Cover Letter
  clTitle?: LocaleString
  clSubtitle?: LocaleString
  // Builder
  builderTitle?: LocaleString
  builderSubtitle?: LocaleString
  // Blog
  blogH1a?: LocaleString
  blogH1b?: LocaleString
  blogSubtitle?: LocaleString
  // Footer
  footerTagline?: LocaleString
}

const SiteContentContext = createContext<SiteContent>({})

export function SiteContentProvider({
  content,
  children,
}: {
  content: SiteContent
  children: React.ReactNode
}) {
  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  )
}

export const useSiteContent = () => useContext(SiteContentContext)
