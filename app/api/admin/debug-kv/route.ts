import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { kv } from '@/lib/kv'
import type { Post } from '@/lib/posts'

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const slugList = await kv.get<string[]>('blog:posts:all')

  const posts: Record<string, Post | null> = {}
  if (slugList && slugList.length > 0) {
    for (const slug of slugList) {
      posts[slug] = await kv.get<Post>(`blog:post:${slug}`)
    }
  }

  return NextResponse.json({
    'blog:posts:all': slugList,
    posts,
    postCount: slugList?.length ?? 0,
  })
}
