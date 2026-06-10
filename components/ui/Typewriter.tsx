'use client'

import { useState, useEffect } from 'react'

interface TypewriterProps {
  text: string
  run?: boolean
  speed?: number
  onDone?: () => void
}

export default function Typewriter({ text, run = true, speed = 26, onDone }: TypewriterProps) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!run) { setN(text.length); return }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i++; setN(i)
      if (i >= text.length) { clearInterval(id); onDone?.() }
    }, speed)
    return () => clearInterval(id)
  }, [text, run, speed, onDone])

  const done = n >= text.length

  return (
    <span>
      {text.slice(0, n)}
      <span style={{
        opacity: done ? 0 : 1,
        animation: done ? 'none' : 'blink 1s step-end infinite',
        borderRight: '3px solid var(--accent)',
        marginLeft: 1,
      }} />
    </span>
  )
}
