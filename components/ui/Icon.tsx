'use client'

interface IconProps {
  name: string
  size?: number
  stroke?: number
  style?: React.CSSProperties
}

export default function Icon({ name, size = 20, stroke = 1.7, style }: IconProps) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style,
  }
  switch (name) {
    case 'upload':   return <svg {...p}><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>
    case 'arrow':    return <svg {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
    case 'back':     return <svg {...p}><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
    case 'check':    return <svg {...p}><path d="m5 13 4 4L19 7"/></svg>
    case 'plus':     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>
    case 'x':        return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>
    case 'spark':    return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>
    case 'download': return <svg {...p}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
    case 'share':    return <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5"/></svg>
    case 'doc':      return <svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>
    case 'refresh':  return <svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
    case 'flag':     return <svg {...p}><path d="M4 21V4M4 4h12l-2 4 2 4H4"/></svg>
    case 'bolt':     return <svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
    case 'star':     return <svg {...p} fill="currentColor" stroke="none"><path d="M12 3.5 14.4 9l5.6.5-4.3 3.7 1.3 5.5L12 15.8 7 18.7l1.3-5.5L4 9.5 9.6 9z"/></svg>
    default:         return null
  }
}
