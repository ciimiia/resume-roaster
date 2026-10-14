import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { safeGet } from '@/lib/kv'
import type { AnalysisSummary } from '@/app/api/save/route'
import type { CoverLetterSummary } from '@/app/api/cover-letter/route'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/signin')

  const [analyses, coverLetters] = await Promise.all([
    safeGet<AnalysisSummary[]>(`user:analyses:${session.userId}`, []),
    safeGet<CoverLetterSummary[]>(`user:coverletters:${session.userId}`, []),
  ])

  return (
    <DashboardClient
      analyses={analyses}
      coverLetters={coverLetters}
    />
  )
}
