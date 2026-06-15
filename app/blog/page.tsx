import { POSTS } from '@/lib/posts'
import type { Post } from '@/lib/posts'
import { kv } from '@/lib/kv'
import BlogIndex from '@/components/blog/BlogIndex'

export const dynamic = 'force-dynamic'

async function getKvPosts(): Promise<Post[]> {
  const slugs = await kv.get<string[]>('blog:posts:all')
  console.log('[blog/page] blog:posts:all =', slugs)
  if (!slugs || slugs.length === 0) return []
  const posts = await Promise.all(slugs.map(s => kv.get<Post>(`blog:post:${s}`)))
  const valid = posts.filter((p): p is Post => p !== null)
  console.log('[blog/page] fetched', valid.length, 'KV posts:', valid.map(p => p.slug))
  return valid
}

export default async function BlogPage() {
  const kvPosts = await getKvPosts()

  // Merge: KV posts first (newest), then static — deduplicate by slug
  const staticSlugs = new Set(POSTS.map(p => p.slug))
  const newKvPosts = kvPosts.filter(p => !staticSlugs.has(p.slug))
  const allPosts = [...newKvPosts, ...POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  console.log('[blog/page] allPosts slugs:', allPosts.map(p => p.slug))
  return <BlogIndex allPosts={allPosts} />
}
