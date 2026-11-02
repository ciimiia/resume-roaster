import { env } from '@/lib/env'

/** Shared CRON_SECRET bearer-token check — same pattern app/api/cron/generate-post/route.ts uses inline. */
export function isAuthorizedCronRequest(req: { headers: { get(name: string): string | null } }): boolean {
  const secret = env.cronSecret
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}
