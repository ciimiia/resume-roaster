'use client'

import Image from 'next/image'
import { useTheme } from '@/lib/ThemeContext'
import { PRODUCT } from '@/lib/config'

interface LogoProps {
  size?: number
  onClick?: () => void
}

// The real logo (public/logo.png) — mark + "michi ai" wordmark baked
// together into one image at a 395:256 aspect ratio. `size` is the
// rendered height; width follows that ratio.
const ASPECT = 395 / 256

export default function Logo({ size = 30, onClick }: LogoProps) {
  const { theme } = useTheme()
  const height = size * 1.3
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', cursor: onClick ? 'pointer' : 'default', userSelect: 'none' }}
    >
      <Image
        src="/logo.png"
        alt={PRODUCT.name}
        width={Math.round(height * ASPECT)}
        height={Math.round(height)}
        style={{
          height, width: 'auto', display: 'block',
          // The wordmark's ink color is baked into the PNG (dark navy),
          // so on the dark theme's dark-navy chrome it'd be nearly
          // illegible without this — a light pill behind the mark keeps
          // it readable without needing a separate dark-mode asset.
          ...(theme === 'dark' && {
            background: '#fff', borderRadius: 8, padding: '4px 8px',
          }),
        }}
      />
    </div>
  )
}
