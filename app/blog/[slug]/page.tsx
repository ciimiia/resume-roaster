import { notFound } from 'next/navigation'
import { POSTS, getPost } from '@/lib/posts'
import PostContent from '@/components/blog/PostContent'

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) return {}
  return { title: `${post.title} — Resume Roaster`, description: post.excerpt }
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()

  const others = POSTS.filter(p => p.slug !== post.slug).slice(0, 2)

  return <PostContent post={post} others={others} />
}
