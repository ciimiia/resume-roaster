/**
 * Shared fetch helper for ingestion adapters: times out instead of hanging
 * a cron run, and never throws on a non-2xx — callers decide what that
 * means (adapters generally return "no jobs" rather than crashing the
 * whole ingestion run over one bad source; see lib/jobIngestion/runner.ts).
 */

export interface FetchJsonResult<T> {
  ok: boolean
  status: number
  data: T | null
}

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 15000): Promise<FetchJsonResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      return { ok: false, status: res.status, data: null }
    }
    const data = (await res.json()) as T
    return { ok: true, status: res.status, data }
  } finally {
    clearTimeout(timer)
  }
}
