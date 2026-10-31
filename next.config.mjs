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
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
}

export default nextConfig
