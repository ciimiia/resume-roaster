import { POSTS } from '@/lib/posts'
import { listAiPosts } from '@/lib/db/blog'
import { getSiteContent } from '@/lib/db/siteSettings'
import BlogIndex from '@/components/blog/BlogIndex'
import { SiteContentProvider } from '@/lib/SiteContentContext'

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const [aiPosts, siteContent] = await Promise.all([
    listAiPosts().catch(err => {
      console.error('[blog/page] failed to load AI posts, using static only:', err)
      return []
    }),
    getSiteContent().catch(err => {
      console.error('[blog/page] failed to load site content:', err)
      return {}
    }),
  ])

  // Merge: AI posts first (newest), then static — deduplicate by slug
  const staticSlugs = new Set(POSTS.map(p => p.slug))
  const newAiPosts = aiPosts.filter(p => !staticSlugs.has(p.slug))
  const allPosts = [...newAiPosts, ...POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <SiteContentProvider content={siteContent}>
      <BlogIndex allPosts={allPosts} />
    </SiteContentProvider>
  )
}
