/**
 * Tells you exactly which integrations are live and what's missing.
 *
 *   npm run check:config
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const val = (k) => (process.env[k] ?? '').trim()

const rows = []
const todo = []

const check = (label, ok, detail, fix) => {
  rows.push(`  ${ok ? '✔' : '·'}  ${label.padEnd(26)} ${detail}`)
  if (!ok && fix) todo.push(fix)
}

console.log('\nLumière — integration status\n' + '─'.repeat(58))

if (!existsSync(join(ROOT, '.env'))) {
  console.log('\n  No .env file yet.\n')
  console.log('  Create one by copying the template:')
  console.log('      copy .env.example .env        (Windows)')
  console.log('      cp .env.example .env          (macOS / Linux)\n')
}

// ── Clerk ──
const pk = val('VITE_CLERK_PUBLISHABLE_KEY')
const sk = val('CLERK_SECRET_KEY')
const clerkOn = pk.startsWith('pk_') && sk.startsWith('sk_')

console.log('\nAuthentication')
check('publishable key', pk.startsWith('pk_'), pk ? `${pk.slice(0, 11)}…` : 'not set',
  'Add VITE_CLERK_PUBLISHABLE_KEY (starts with pk_) from dashboard.clerk.com → API keys')
check('secret key', sk.startsWith('sk_'), sk ? `${sk.slice(0, 7)}…` : 'not set',
  'Add CLERK_SECRET_KEY (starts with sk_) from the same page')
console.log(rows.splice(0).join('\n'))
console.log(`\n  → ${clerkOn
  ? 'Clerk is ACTIVE. The built-in password login is disabled.'
  : 'Using the built-in password login. Demo accounts still work.'}`)

// ── Resend ──
const rk = val('RESEND_API_KEY')
const from = val('RESEND_FROM') || 'Lumière <onboarding@resend.dev>'
const testSender = from.includes('onboarding@resend.dev')

console.log('\nEmail')
check('api key', rk.startsWith('re_'), rk ? `${rk.slice(0, 6)}…` : 'not set',
  'Add RESEND_API_KEY (starts with re_) from resend.com → API Keys')
check('from address', true, from)
console.log(rows.splice(0).join('\n'))

if (!rk) {
  console.log('\n  → Emails print to the terminal instead of sending.')
} else if (testSender) {
  console.log('\n  → Resend is ACTIVE, but using the shared test sender:')
  console.log('    it will ONLY deliver to the address you registered with Resend.')
  console.log('    Verify a domain at resend.com/domains to email real customers.')
} else {
  console.log('\n  → Resend is ACTIVE and sending from your own domain.')
}

if (todo.length) {
  console.log('\n' + '─'.repeat(58))
  console.log('To finish setup:\n')
  todo.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))
}

console.log('\nRestart `npm run dev` after changing .env.\n')
