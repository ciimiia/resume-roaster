/**
 * Renders HTML to a PDF buffer via headless Chromium — the only approach
 * that gets genuinely correct Persian (Arabic-script) text shaping/joining
 * for free, since it's real browser text layout rather than a from-scratch
 * shaping implementation. See the Phase 4 report for why this was chosen
 * over a pure-JS PDF library (pdf-lib/pdfkit can embed the font but have
 * no real bidi/Arabic-joining shaping engine) and the bundle-size/
 * cold-start tradeoff that comes with it.
 *
 * On Vercel: @sparticuz/chromium (a Chromium build packaged specifically
 * for serverless platforms) + puppeteer-core. Locally (this repo's own
 * Windows dev machine, where that Linux-only binary can't run at all):
 * falls back to a locally installed Chrome/Edge via puppeteer-core's
 * `executablePath`, purely so this code is actually testable in dev —
 * production always uses the bundled serverless Chromium.
 */
import 'server-only'
import { existsSync } from 'fs'
import type { Browser } from 'puppeteer-core'

const LOCAL_CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
]

function findLocalExecutable(): string | null {
  return LOCAL_CHROME_CANDIDATES.find(p => existsSync(p)) ?? null
}

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core')

  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  const localPath = findLocalExecutable()
  if (!localPath) {
    throw new Error('No local Chrome/Edge found for dev-time PDF rendering — this only matters outside Vercel (see lib/tailoring/pdf/render.ts).')
  }
  return puppeteer.launch({ executablePath: localPath, headless: true })
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
