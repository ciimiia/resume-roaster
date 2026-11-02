/**
 * pdfjs-dist (pdf-parse's dependency) calls `new DOMMatrix(...)` in some
 * code paths — gradient/pattern handling, hit even for plain getText()
 * calls on some PDFs — but Node.js has no DOMMatrix global. pdfjs-dist
 * itself looks for `canvas?.DOMMatrix` and falls back to a "cannot
 * polyfill" warning (not a throw) if the (heavy, native-dependency) canvas
 * package isn't installed; we provide a lightweight, dependency-free
 * equivalent instead. Confirmed via a real PDF upload on Vercel's actual
 * serverless runtime — this crash didn't reproduce locally until tested
 * in that environment specifically.
 *
 * Import this (for its side effect) before any dynamic `import('pdf-parse')`.
 * Safe to call more than once.
 */
import CSSMatrix from '@thednp/dommatrix'

export function ensureDomMatrixPolyfill(): void {
  const g = globalThis as { DOMMatrix?: unknown }
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = CSSMatrix
  }
}
