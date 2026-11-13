import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { listResultsForUser } from '@/lib/db/results'
import { listCoverLettersForUser } from '@/lib/db/coverLetters'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/signin?next=%2Fdashboard')

  const [analyses, coverLetters] = await Promise.all([
    listResultsForUser(session.userId).catch(err => {
      console.error('[dashboard] failed to load analyses:', err)
      return []
    }),
    listCoverLettersForUser(session.userId).catch(err => {
      console.error('[dashboard] failed to load cover letters:', err)
      return []
    }),
  ])

  return (
    <DashboardClient
      analyses={analyses}
      coverLetters={coverLetters}
    />
  )
}
