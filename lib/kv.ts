/**
 * Minimal Upstash Redis REST client — same interface as @vercel/kv
 * Uses KV_REST_API_URL and KV_REST_API_TOKEN (Vercel KV env vars).
 */

const url   = () => process.env.KV_REST_API_URL
const token = () => process.env.KV_REST_API_TOKEN

// Keep this well under typical page-load patience — if the KV host is down
// or unreachable (bad DNS, network block), fail fast instead of hanging on
// the platform's ~10s default connect timeout for every page that reads KV.
const REQUEST_TIMEOUT_MS = 1500

async function cmd<T>(command: unknown[]): Promise<T> {
  const endpoint = url()
  const auth = token()
  if (!endpoint || !auth) throw new Error('KV env vars not set (KV_REST_API_URL, KV_REST_API_TOKEN)')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!res.ok) throw new Error(`KV error ${res.status}: ${await res.text()}`)
  const { result } = await res.json() as { result: T }
  return result
}

export const kv = {
  /** Store value as JSON string, with optional TTL in seconds */
  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    const args: unknown[] = ['SET', key, JSON.stringify(value)]
    if (opts?.ex) args.push('EX', opts.ex)
    await cmd(args)
  },

  /** Retrieve and parse stored JSON value, or null if missing */
  async get<T>(key: string): Promise<T | null> {
    const raw = await cmd<string | null>(['GET', key])
    if (raw === null) return null
    return JSON.parse(raw) as T
  },
}

/**
 * Like kv.get, but never throws — logs and returns the fallback instead.
 * Use this in page/route handlers where KV is "nice to have" (site content,
 * cached post lists, etc.) so a KV outage doesn't take down the whole page.
 */
export async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await kv.get<T>(key)
    return value ?? fallback
  } catch (err) {
    console.error(`[kv] safeGet("${key}") failed, using fallback:`, err)
    return fallback
  }
}
