import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import TailorClient from './TailorClient'

export default async function TailorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    // Preserve jobId/view so bouncing through sign-in doesn't lose which
    // job the user was tailoring for — same reasoning as app/jobs/page.tsx.
    const sp = await searchParams
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === 'string') qs.set(k, v)
    }
    const next = qs.toString() ? `/jobs/tailor?${qs.toString()}` : '/jobs/tailor'
    redirect(`/signin?next=${encodeURIComponent(next)}`)
  }

  return <TailorClient />
}
