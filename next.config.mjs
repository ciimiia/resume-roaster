/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow next/font to fall back gracefully when Google Fonts is unreachable
  // (common in regions where fonts.gstatic.com is blocked/throttled)
  experimental: {
    optimizePackageImports: [],
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
    serverComponentsExternalPackages: ['@node-rs/argon2', 'pdf-parse', 'pdfjs-dist'],
  },
}

export default nextConfig
