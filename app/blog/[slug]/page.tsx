import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { POSTS, getPost } from '@/lib/posts'
import type { Post } from '@/lib/posts'
import { kv } from '@/lib/kv'
import PostContent from '@/components/blog/PostContent'

const SITE_URL = 'https://resume-roaster.vercel.app'
const OG_IMAGE = `${SITE_URL}/opengraph-image`

const POST_KEYWORDS: Record<string, string[]> = {
  'how-to-write-a-resume-that-passes-ats': [
    'ATS resume checker', 'how to pass ATS', 'applicant tracking system resume',
    'ATS optimization', 'resume keywords', 'ATS-friendly resume format',
  ],
  'top-mistakes-on-developer-resumes': [
    'developer resume mistakes', 'software engineer resume tips', 'tech resume review',
    'programming resume', 'software developer CV', 'coding resume',
  ],
  'how-to-get-a-remote-job-in-2026': [
    'remote job resume tips', 'how to get a remote job', 'remote work resume',
    'fully remote jobs 2026', 'remote job search', 'work from home resume',
  ],
}

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }))
}

async function resolvePost(slug: string): Promise<Post | null> {
  const staticPost = getPost(slug)
  if (staticPost) return staticPost
  try {
    return await kv.get<Post>(`blog:post:${slug}`)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await resolvePost(params.slug)
  if (!post) return {}
  const url = `${SITE_URL}/blog/${post.slug}`
  return {
    title: post.title,
    description: post.excerpt,
    keywords: POST_KEYWORDS[post.slug] ?? [],
    authors: [{ name: 'Resume Roaster' }],
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url,
      publishedTime: post.date,
      authors: ['Resume Roaster'],
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [OG_IMAGE],
    },
    alternates: { canonical: url },
  }
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await resolvePost(params.slug)
  if (!post) notFound()

  const others = POSTS.filter(p => p.slug !== post.slug).slice(0, 2)
  const url = `${SITE_URL}/blog/${post.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Resume Roaster', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Resume Roaster',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: OG_IMAGE,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostContent post={post} others={others} />
    </>
  )
}
