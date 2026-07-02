import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv } from '@/lib/kv'
import { POSTS } from '@/lib/posts'
import type { Post } from '@/lib/posts'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

export default async function AdminPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/signin')
  if (!isAdminEmail(session.email)) redirect('/')

  // Fetch KV posts
  const kvSlugs = (await kv.get<string[]>('blog:posts:all')) ?? []
  const kvPosts = (await Promise.all(kvSlugs.map(s => kv.get<Post>(`blog:post:${s}`))))
    .filter((p): p is Post => p !== null)

  // Static posts (read-only)
  const staticSlugs = new Set(POSTS.map(p => p.slug))
  const allPosts = [
    ...kvPosts.map(p => ({ ...p, source: 'ai' as const })),
    ...POSTS.filter(p => !kvPosts.find(k => k.slug === p.slug)).map(p => ({ ...p, source: 'static' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return <AdminClient email={session.email} posts={allPosts} />
}
