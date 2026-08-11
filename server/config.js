/**
 * Runtime configuration, read once from the environment.
 *
 * Every integration degrades gracefully: with no keys the app falls back to the
 * built-in password login and prints emails to the terminal instead of sending
 * them. Filling in `.env` switches the real services on — nothing else changes.
 */

const clean = (v) => {
  const s = (v ?? '').trim()
  // Ignore placeholder values left behind from .env.example.
  return s && !s.startsWith('<') && s !== 'your-key-here' ? s : ''
}

export const CLERK_SECRET_KEY = clean(process.env.CLERK_SECRET_KEY)
export const CLERK_PUBLISHABLE_KEY = clean(process.env.VITE_CLERK_PUBLISHABLE_KEY)

/** Clerk owns authentication only when both halves of the key pair are present. */
export const CLERK_ENABLED = Boolean(CLERK_SECRET_KEY && CLERK_PUBLISHABLE_KEY)

export const RESEND_API_KEY = clean(process.env.RESEND_API_KEY)
export const RESEND_ENABLED = Boolean(RESEND_API_KEY)
export const RESEND_FROM = clean(process.env.RESEND_FROM) || 'Lumière <onboarding@resend.dev>'
export const SELLER_ALERT_OVERRIDE = clean(process.env.SELLER_ALERT_OVERRIDE)

export const PUBLIC_URL = clean(process.env.PUBLIC_URL) || 'http://localhost:5173'
export const PORT = Number(clean(process.env.PORT)) || 4000

/** One-line summary printed at boot so the active mode is never a mystery. */
export function describeConfig() {
  return [
    `  auth   : ${CLERK_ENABLED ? 'Clerk' : 'built-in password login (set Clerk keys to switch)'}`,
    `  email  : ${RESEND_ENABLED ? `Resend, from ${RESEND_FROM}` : 'console only (set RESEND_API_KEY to send)'}`,
  ].join('\n')
}
