'use client'

import { useState, type ReactNode } from 'react'
import Icon from './Icon'

interface ButtonProps {
  children?: ReactNode
  variant?: 'primary' | 'ghost' | 'quiet' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  iconRight?: string
  full?: boolean
  style?: React.CSSProperties
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export default function Button({
  children, variant = 'primary', size = 'md',
  icon, iconRight, full, style, onClick, disabled, type = 'button',
}: ButtonProps) {
  const s = { sm: { p: '9px 16px', fs: 14, r: 10 }, md: { p: '14px 22px', fs: 16, r: 13 }, lg: { p: '18px 30px', fs: 18, r: 15 } }[size]

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em',
    border: '1px solid transparent', borderRadius: s.r,
    padding: s.p, fontSize: s.fs, width: full ? '100%' : 'auto',
    transition: 'transform .15s cubic-bezier(.34,1.56,.64,1), background .2s, border-color .2s, box-shadow .2s, color .2s',
    whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1,
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(140deg, var(--accent), var(--accent-2))',
      color: 'var(--accent-ink)',
      boxShadow: '0 10px 30px var(--glow), inset 0 1px 0 rgba(255,255,255,.35)',
    },
    ghost:   { background: 'var(--surface-2)', color: 'var(--ink)', borderColor: 'var(--line-2)' },
    quiet:   { background: 'transparent', color: 'var(--ink-soft)', borderColor: 'transparent' },
    outline: { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' },
  }

  const [hover, setHover] = useState(false)
  const hoverFx: React.CSSProperties = (hover && !disabled) ? { transform: 'translateY(-2px)' } : {}

  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...variants[variant], ...hoverFx, ...style }}
    >
      {icon && <Icon name={icon} size={s.fs + 2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.fs + 2} />}
    </button>
  )
}
