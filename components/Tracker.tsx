'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function Tracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Skip admin/api paths
    if (pathname.startsWith('/api') || pathname.startsWith('/admin')) return
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {})
  }, [pathname])

  return null
}
