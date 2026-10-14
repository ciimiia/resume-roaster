import { POSTS } from '@/lib/posts'
import type { Post } from '@/lib/posts'
import { kv, safeGet } from '@/lib/kv'
import BlogIndex from '@/components/blog/BlogIndex'
import { SiteContentProvider } from '@/lib/SiteContentContext'
import type { SiteContent } from '@/lib/SiteContentContext'

export const dynamic = 'force-dynamic'

async function getKvPosts(): Promise<Post[]> {
  try {
    const slugs = await kv.get<string[]>('blog:posts:all')
    if (!slugs || slugs.length === 0) return []
    const posts = await Promise.all(slugs.map(s => kv.get<Post>(`blog:post:${s}`)))
    return posts.filter((p): p is Post => p !== null)
  } catch (err) {
    console.error('[blog/page] failed to load KV posts, using static only:', err)
    return []
  }
}

export default async function BlogPage() {
  const [kvPosts, siteContent] = await Promise.all([
    getKvPosts(),
    safeGet<SiteContent>('site:content', {}),
  ])

  // Merge: KV posts first (newest), then static — deduplicate by slug
  const staticSlugs = new Set(POSTS.map(p => p.slug))
  const newKvPosts = kvPosts.filter(p => !staticSlugs.has(p.slug))
  const allPosts = [...newKvPosts, ...POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <SiteContentProvider content={siteContent}>
      <BlogIndex allPosts={allPosts} />
    </SiteContentProvider>
  )
}
