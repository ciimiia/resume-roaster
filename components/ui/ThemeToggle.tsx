'use client'

import { useTheme } from '@/lib/ThemeContext'
import { useLang } from '@/lib/LangContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLang()
  const isLight = theme === 'light'
  return (
    <button
      onClick={toggleTheme}
      title={isLight ? t.themeDark : t.themeLight}
      style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--surface-2)', border: '1px solid var(--line-2)',
        borderRadius: 8, padding: '5px 9px', cursor: 'pointer',
        color: 'var(--ink-mute)', fontSize: 15, lineHeight: 1,
        transition: 'all .2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-mute)' }}
    >
      {isLight ? '🌙' : '☀️'}
    </button>
  )
}
