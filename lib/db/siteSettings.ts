import { eq } from 'drizzle-orm'
import { getDb, schema } from './index'
import type { SiteContent } from '@/lib/SiteContentContext'

const SITE_CONTENT_KEY = 'site:content'

export async function getSiteContent(): Promise<SiteContent> {
  const db = getDb()
  const rows = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, SITE_CONTENT_KEY)).limit(1)
  return (rows[0]?.value as SiteContent | undefined) ?? {}
}

/** Never throws — logs and returns {} on failure, same fail-soft behavior the old KV safeGet had. */
export async function getSiteContentSafe(): Promise<SiteContent> {
  try {
    return await getSiteContent()
  } catch (err) {
    console.error('[siteSettings] getSiteContentSafe failed, using {}:', err)
    return {}
  }
}

export async function setSiteContent(content: SiteContent): Promise<void> {
  const db = getDb()
  await db.insert(schema.siteSettings)
    .values({ key: SITE_CONTENT_KEY, value: content })
    .onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value: content, updatedAt: new Date() },
    })
}
