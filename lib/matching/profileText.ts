/**
 * Flattens a ParsedProfile into plain text for embedding and for the
 * re-rank LLM prompt (lib/matching/rerank.ts). One builder, two uses, so
 * the embedding vector and what the re-rank model sees stay consistent.
 */
import type { ParsedProfile } from '@/lib/resumeProfile'

export function buildProfileText(profile: ParsedProfile): string {
  const parts: string[] = []

  if (profile.summary) parts.push(profile.summary)

  if (profile.experience.length > 0) {
    parts.push(
      'Experience:\n' +
      profile.experience.map(e => {
        const header = `${e.title} at ${e.company}${e.location ? ` (${e.location})` : ''}`
        const bullets = e.bullets.map(b => `- ${b}`).join('\n')
        return bullets ? `${header}\n${bullets}` : header
      }).join('\n\n')
    )
  }

  if (profile.skills.length > 0) {
    parts.push(`Skills: ${profile.skills.join(', ')}`)
  }

  if (profile.education.length > 0) {
    parts.push(
      'Education:\n' +
      profile.education.map(e => [e.degree, e.field, 'at', e.school].filter(Boolean).join(' ')).join('\n')
    )
  }

  if (profile.projects.length > 0) {
    parts.push(
      'Projects:\n' +
      profile.projects.map(p => p.description ? `${p.name}: ${p.description}` : p.name).join('\n')
    )
  }

  if (profile.certifications.length > 0) {
    parts.push(`Certifications: ${profile.certifications.map(c => c.name).join(', ')}`)
  }

  if (profile.languages.length > 0) {
    parts.push(`Languages: ${profile.languages.map(l => l.proficiency ? `${l.name} (${l.proficiency})` : l.name).join(', ')}`)
  }

  return parts.join('\n\n')
}
