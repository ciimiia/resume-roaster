import { fileURLToPath } from 'url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15 warns that it found a second lockfile at a parent directory
  // (an unrelated stray file in the user's home dir, not part of this
  // project) and may infer the wrong workspace root from it. The relative
  // paths in outputFileTracingIncludes below are resolved against whatever
  // root Next picks, so a wrong guess here would silently reintroduce the
  // "pdf.worker.mjs missing from the deployed bundle" bug. Pinning it
  // explicitly removes the ambiguity.
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  // @node-rs/argon2 ships a native .node binary per platform. Without
  // this, webpack tries to parse the binary as JS/an asset module and
  // fails the build ("Module parse failed: Unexpected character").
  // Marking it external tells Next to `require()` it at runtime instead
  // of bundling it, which is also what lets the correct per-platform
  // binary (Linux on Vercel, whatever's installed locally otherwise)
  // resolve correctly instead of baking in one platform's binary.
  // pdf-parse (via pdfjs-dist) ships a separate worker file
  // (pdf.worker.mjs) that it dynamically imports by relative path at
  // runtime. Webpack relocates it into .next/server/chunks/ without
  // actually copying the physical file there, so the dynamic import
  // fails ("Cannot find module '.../pdf.worker.mjs'") in both dev and a
  // production build. Marking both packages external makes Next resolve
  // them via plain require() from node_modules at runtime instead, where
  // the worker file genuinely exists next to the rest of the package.
  //
  // Moved out of `experimental` for Next 15 — this option stabilized to
  // the top level (`serverExternalPackages`) in Next 15; the old
  // `experimental.serverComponentsExternalPackages` key still works but is
  // deprecated.
  // puppeteer-core + @sparticuz/chromium (Phase 4 PDF export, see
  // lib/tailoring/pdf/render.ts) — @sparticuz/chromium ships a large
  // platform-specific binary; same reasoning as @node-rs/argon2 below for
  // why this must be external rather than webpack-bundled.
  serverExternalPackages: ['@node-rs/argon2', 'pdf-parse', 'pdfjs-dist', 'puppeteer-core', '@sparticuz/chromium'],
  // Externalizing pdfjs-dist (above) means webpack no longer statically
  // analyzes its imports, so Next's output file tracing — which decides
  // what actually gets copied into each deployed serverless function's
  // bundle — never discovers pdf.worker.mjs (pdfjs-dist loads it via a
  // dynamic, string-built path at runtime, which tracing can't follow).
  // Without this, the function deploys fine and builds fine locally, but
  // throws "Cannot find module '.../pdf.worker.mjs'" in Vercel's actual
  // serverless runtime specifically, because the file was traced out.
  // Confirmed necessary by testing an actual deployment, not just a
  // local build — this class of bug doesn't reproduce with `next build`
  // alone.
  //
  // Moved out of `experimental` for Next 15 — stabilized to the top level.
  outputFileTracingIncludes: {
    '/api/analyze': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    '/api/resumes': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    // @sparticuz/chromium ships its actual Chromium binary (and the fonts/
    // swiftshader/al2023 archives it unpacks at cold start) as non-JS
    // assets under bin/ — externalizing the package (above) stops them
    // from being bundled, but also means tracing can't discover them via
    // static import analysis, same class of bug as pdf.worker.mjs above.
    // Confirmed necessary against an actual Vercel deployment: without
    // this, the function builds and deploys fine but throws "The input
    // directory .../@sparticuz/chromium/bin does not exist" at runtime.
    // public/fonts/* (the embedded Vazirmatn files, lib/tailoring/pdf/fonts.ts)
    // is included explicitly too, even though Next normally ships all of
    // public/ unconditionally — belt-and-suspenders since this is the one
    // route where a missing font file would silently degrade to garbled
    // PDF output rather than a loud error.
    '/api/tailor/[id]/pdf': ['./node_modules/@sparticuz/chromium/bin/**', './public/fonts/*'],
    '/api/cover-letter/[id]/pdf': ['./node_modules/@sparticuz/chromium/bin/**', './public/fonts/*'],
  },

  // Launch-readiness security pass. Built and checked against this app's
  // actual needs, not a generic template:
  //  - style-src needs 'unsafe-inline' because every component here uses
  //    React's `style={{...}}` (inline style attributes), not CSS modules —
  //    removing it would break the entire UI, not just a few components.
  //  - script-src needs 'unsafe-inline' for Next's small inline bootstrap/
  //    hydration script; everything else (app code) ships as external
  //    same-origin chunks.
  //  - fonts.googleapis.com/fonts.gstatic.com: Google Fonts, loaded from
  //    app/layout.tsx (Space Grotesk/Hanken Grotesk/Space Mono/Syne) and
  //    lib/LangContext.tsx (Vazirmatn for Farsi) — both via <link> tags,
  //    not next/font (see app/layout.tsx's comment on why).
  //  - connect-src 'self' only: every OpenRouter/Resend call in this app
  //    happens server-side (fetch from a route handler), never from the
  //    browser — the client never needs to connect anywhere but this origin.
  //  - frame-ancestors 'none' + X-Frame-Options: DENY: this app is never
  //    meant to be embedded in another site's iframe.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      ],
    }]
  },
}

export default nextConfig
