import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { Post } from '@/lib/posts'

function toPost(row: typeof schema.blogPosts.$inferSelect): Post {
  return {
    slug: row.slug,
    title: row.title,
    titleFa: row.titleFa ?? undefined,
    excerpt: row.excerpt,
    excerptFa: row.excerptFa ?? undefined,
    date: row.date,
    readTime: row.readTime,
    tag: row.tag,
    content: row.content as Post['content'],
    coverImage: row.coverImage ?? undefined,
  }
}

/** All AI-generated posts, newest first. The 3 static posts are separate (lib/posts.ts). */
export async function listAiPosts(): Promise<Post[]> {
  const db = getDb()
  const rows = await db.select().from(schema.blogPosts).orderBy(desc(schema.blogPosts.date))
  return rows.map(toPost)
}

export async function getAiPostBySlug(slug: string): Promise<Post | null> {
  const db = getDb()
  const rows = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, slug)).limit(1)
  return rows[0] ? toPost(rows[0]) : null
}

export async function createAiPost(post: Post): Promise<void> {
  const db = getDb()
  await db.insert(schema.blogPosts).values({
    slug: post.slug,
    title: post.title,
    titleFa: post.titleFa,
    excerpt: post.excerpt,
    excerptFa: post.excerptFa,
    date: post.date,
    readTime: post.readTime,
    tag: post.tag,
    content: post.content,
    coverImage: post.coverImage,
  })
}

export async function deleteAiPost(slug: string): Promise<void> {
  const db = getDb()
  await db.delete(schema.blogPosts).where(eq(schema.blogPosts.slug, slug))
}

/** Recent post titles, for the cron job's topic-dedup check (was usedSlugs.slice(0,30)). */
export async function listRecentPostTitles(limit = 30): Promise<string[]> {
  const db = getDb()
  const rows = await db.select({ title: schema.blogPosts.title })
    .from(schema.blogPosts)
    .orderBy(desc(schema.blogPosts.date))
    .limit(limit)
  return rows.map(r => r.title)
}
