/**
 * Embeds Vazirmatn (the same font this app already uses for Farsi UI —
 * lib/LangContext.tsx) as base64 data URIs directly in the PDF's HTML,
 * split by Unicode subset (unicode-range) exactly the way Fontsource/
 * Google Fonts serve it, so the browser picks Latin vs. Arabic-script
 * (Persian) glyphs per character automatically from one @font-face family.
 *
 * Read from disk and base64-embedded rather than loaded over the network
 * (even from this same deployment's own /public) — fully self-contained,
 * so PDF rendering can't fail on an internal network hiccup inside the
 * serverless function. Files live in public/fonts/ specifically (not
 * read from node_modules) because Next's output file tracing only
 * reliably includes files under public/ for every route without the
 * per-route outputFileTracingIncludes config next.config.mjs already
 * needs for pdf-parse/pdfjs-dist — see that file's comment for the exact
 * failure mode ("works in a local build, breaks on Vercel specifically")
 * this sidesteps.
 */
import 'server-only'
import { readFileSync } from 'fs'
import { join } from 'path'

// Fontsource's own unicode-range values for these exact files (copied
// from node_modules/@fontsource/vazirmatn/arabic-400.css / latin-400.css)
// — not guessed, so no glyphs fall through to a missing-font fallback.
const ARABIC_UNICODE_RANGE = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1'
const LATIN_UNICODE_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

function fontFileToDataUri(filename: string): string {
  const bytes = readFileSync(join(process.cwd(), 'public', 'fonts', filename))
  return `data:font/woff2;base64,${bytes.toString('base64')}`
}

let cachedFontFaceCss: string | null = null

/** @font-face CSS block for both weights/subsets — computed once per server process, not once per request. */
export function getVazirmatnFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss

  const arabic400 = fontFileToDataUri('vazirmatn-arabic-400-normal.woff2')
  const latin400 = fontFileToDataUri('vazirmatn-latin-400-normal.woff2')
  const arabic700 = fontFileToDataUri('vazirmatn-arabic-700-normal.woff2')
  const latin700 = fontFileToDataUri('vazirmatn-latin-700-normal.woff2')

  cachedFontFaceCss = `
@font-face { font-family: 'Vazirmatn'; font-style: normal; font-weight: 400; src: url(${arabic400}) format('woff2'); unicode-range: ${ARABIC_UNICODE_RANGE}; }
@font-face { font-family: 'Vazirmatn'; font-style: normal; font-weight: 400; src: url(${latin400}) format('woff2'); unicode-range: ${LATIN_UNICODE_RANGE}; }
@font-face { font-family: 'Vazirmatn'; font-style: normal; font-weight: 700; src: url(${arabic700}) format('woff2'); unicode-range: ${ARABIC_UNICODE_RANGE}; }
@font-face { font-family: 'Vazirmatn'; font-style: normal; font-weight: 700; src: url(${latin700}) format('woff2'); unicode-range: ${LATIN_UNICODE_RANGE}; }
`
  return cachedFontFaceCss
}
