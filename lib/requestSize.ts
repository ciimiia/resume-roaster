/**
 * Launch-readiness security pass: explicit body-size caps per route,
 * rather than relying only on Vercel's platform-level request size limit
 * (currently ~4.5MB on Hobby/Pro) — that's a reasonable ceiling for a
 * file upload, but far too generous for routes that just take a few
 * fields of text (job preferences, a pasted job description, a profile
 * edit). A request over the cap is rejected before JSON.parse, not after —
 * cheap to check, avoids ever parsing/holding an oversized body in memory.
 */
export type ReadJsonResult<T> = { ok: true; data: T } | { ok: false; error: 'TOO_LARGE' | 'INVALID_JSON' }

export async function readJsonWithLimit<T>(req: Request, maxBytes: number): Promise<ReadJsonResult<T>> {
  const text = await req.text()
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, error: 'TOO_LARGE' }
  }
  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return { ok: false, error: 'INVALID_JSON' }
  }
}
