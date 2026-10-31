import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv, safeGet } from '@/lib/kv'
import { env } from '@/lib/env'
import { POSTS } from '@/lib/posts'
import type { Post } from '@/lib/posts'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) redirect('/signin')
  if (!env.isAdminEmail(session.email)) redirect('/')

  // Fetch KV posts (fail safe — admin page should still render if KV is down)
  let kvPosts: Post[] = []
  try {
    const kvSlugs = await safeGet<string[]>('blog:posts:all', [])
    kvPosts = (await Promise.all(kvSlugs.map(s => kv.get<Post>(`blog:post:${s}`))))
      .filter((p): p is Post => p !== null)
  } catch (err) {
    console.error('[admin/page] failed to load KV posts:', err)
  }

  const allPosts = [
    ...kvPosts.map(p => ({ ...p, source: 'ai' as const })),
    ...POSTS.filter(p => !kvPosts.find(k => k.slug === p.slug)).map(p => ({ ...p, source: 'static' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return <AdminClient posts={allPosts} />
}
