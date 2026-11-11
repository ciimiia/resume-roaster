/**
 * Email sending interface — code elsewhere (password reset) depends on
 * `EmailProvider`, not directly on Resend's SDK/API, so swapping providers
 * later only touches this file. Behind RESEND_API_KEY: if unset,
 * `sendEmail` is never called by the password-reset flow in the first
 * place (lib/passwordReset.ts checks env.hasEmailProvider and fails
 * closed before reaching here) — this module doesn't need its own
 * fallback path, but still throws a clear error if misused directly.
 *
 * Why Resend: free tier (100 emails/day, 3,000/month) needs no credit
 * card, a verified domain is only required to send from your own address —
 * their shared onboarding@resend.dev sender works immediately with zero
 * setup for testing. Simple REST API, no SDK dependency needed (plain
 * fetch, consistent with how this project calls OpenRouter).
 */
import 'server-only'
import { env } from '@/lib/env'

export interface EmailProvider {
  send(opts: { to: string; subject: string; text: string }): Promise<{ ok: true } | { ok: false; error: string }>
}

class ResendEmailProvider implements EmailProvider {
  async send(opts: { to: string; subject: string; text: string }): Promise<{ ok: true } | { ok: false; error: string }> {
    const apiKey = env.resendApiKey
    if (!apiKey) throw new Error('[email] ResendEmailProvider used without RESEND_API_KEY set')

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.emailFrom, to: opts.to, subject: opts.subject, text: opts.text }),
      })
      if (!response.ok) {
        console.error('[email] Resend API error, status:', response.status)
        return { ok: false, error: 'SEND_FAILED' }
      }
      return { ok: true }
    } catch (err) {
      console.error('[email] unexpected failure:', err instanceof Error ? err.message : String(err))
      return { ok: false, error: 'SEND_FAILED' }
    }
  }
}

let cached: EmailProvider | null = null

/** Only call this when env.hasEmailProvider is true — see this file's top comment. */
export function getEmailProvider(): EmailProvider {
  if (!cached) cached = new ResendEmailProvider()
  return cached
}
