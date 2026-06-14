'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface SessionUser { userId: string; email: string }

interface SessionCtx {
  user: SessionUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const Ctx = createContext<SessionCtx>({ user: null, loading: true, refresh: async () => {} })

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json() as { user?: SessionUser }
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return <Ctx.Provider value={{ user, loading, refresh }}>{children}</Ctx.Provider>
}

export const useSession = () => useContext(Ctx)
