import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import JobsClient from './JobsClient'

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    // Carry the world-map picker's selection (track/countries/career) through
    // sign-in instead of dropping it — otherwise picking countries on the
    // homepage while signed out loses the selection the moment /jobs
    // bounces to /signin.
    const sp = await searchParams
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === 'string') qs.set(k, v)
    }
    const next = qs.toString() ? `/jobs?${qs.toString()}` : '/jobs'
    redirect(`/signin?next=${encodeURIComponent(next)}`)
  }

  return <JobsClient />
}
