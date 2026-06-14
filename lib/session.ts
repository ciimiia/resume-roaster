/**
 * Lightweight session management using WebCrypto (HMAC-SHA256).
 * Works in both Node.js and Edge Runtime — no external dependencies.
 * Token format: base64url(JSON payload) + "." + base64url(HMAC signature)
 */

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const SESSION_COOKIE = 'rr-session'

export interface SessionPayload {
  userId: string
  email: string
  exp: number
}

function secret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET env var is not set')
  return s
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Buffer.from(u8).toString('base64url')
}

export async function createSession(userId: string, email: string): Promise<string> {
  const payload: SessionPayload = { userId, email, exp: Date.now() + SESSION_DURATION_MS }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded))
  return `${encoded}.${b64url(sig)}`
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const encoded = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const key = await getKey()
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      Buffer.from(sig, 'base64url'),
      new TextEncoder().encode(encoded),
    )
    if (!valid) return null
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SessionPayload
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
