import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getProfileForUser } from '@/lib/db/profiles'
import { getJobPreferencesForUser } from '@/lib/db/jobPreferences'
import { listResumesForUser } from '@/lib/db/resumes'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/signin?next=%2Fprofile')

  const [profile, preferences, resumes] = await Promise.all([
    getProfileForUser(session.userId).catch(err => {
      console.error('[profile] failed to load profile:', err)
      return null
    }),
    getJobPreferencesForUser(session.userId).catch(err => {
      console.error('[profile] failed to load job preferences:', err)
      return null
    }),
    listResumesForUser(session.userId).catch(err => {
      console.error('[profile] failed to load resumes:', err)
      return []
    }),
  ])

  return (
    <ProfileClient
      initialProfile={profile}
      initialPreferences={preferences}
      initialResumes={resumes.map(r => ({
        id: r.id,
        originalFilename: r.originalFilename,
        version: r.version,
        createdAt: r.createdAt,
        hasParsedProfile: r.parsedProfile !== null,
      }))}
    />
  )
}
