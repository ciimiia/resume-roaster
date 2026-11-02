import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { listAiPosts } from '@/lib/db/blog'
import { env } from '@/lib/env'
import { POSTS } from '@/lib/posts'
import type { Post } from '@/lib/posts'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/signin')
  if (!env.isAdminEmail(session.email)) redirect('/')

  // Fail safe — admin page should still render if the DB has a hiccup
  let aiPosts: Post[] = []
  try {
    aiPosts = await listAiPosts()
  } catch (err) {
    console.error('[admin/page] failed to load AI posts:', err)
  }

  const allPosts = [
    ...aiPosts.map(p => ({ ...p, source: 'ai' as const })),
    ...POSTS.filter(p => !aiPosts.find(k => k.slug === p.slug)).map(p => ({ ...p, source: 'static' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return <AdminClient posts={allPosts} />
}
