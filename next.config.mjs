/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow next/font to fall back gracefully when Google Fonts is unreachable
  // (common in regions where fonts.gstatic.com is blocked/throttled)
  experimental: {
    optimizePackageImports: [],
  },
}

export default nextConfig
