/**
 * Sends one real order-confirmation email through the app's own template, so
 * you can check deliverability and how it renders in a real inbox.
 *
 *   node --env-file-if-exists=.env scripts/send-test-email.mjs you@example.com
 */
import { sendOrderConfirmation } from '../server/email.js'
import { RESEND_ENABLED, RESEND_FROM } from '../server/config.js'

const to = process.argv[2]
if (!to) {
  console.error('usage: node --env-file-if-exists=.env scripts/send-test-email.mjs <address>')
  process.exit(1)
}

console.log(`sending as : ${RESEND_FROM}`)
console.log(`sending to : ${to}`)
console.log(`resend     : ${RESEND_ENABLED ? 'live' : 'disabled — will only print to console'}\n`)

// A representative order, matching the real checkout payload shape.
const order = {
  code: 'LM-TEST01',
  createdAt: new Date().toISOString(),
  items: [
    {
      name: 'Oud Mood Elixir', brand: 'Lattafa Shabab', variantLabel: '100 ml',
      qty: 1, price: 4299, slug: 'oud-mood-elixir',
    },
    {
      name: 'Barrier Repair Cream', brand: 'Derma Atelier', variantLabel: '50 ml',
      qty: 2, price: 2499, slug: 'barrier-repair-cream',
    },
  ],
  subtotal: 9297,
  importDuty: 465,
  shipping: 0,
  total: 9762,
  address: {
    fullName: 'Aditya Pratap Singh',
    line1: 'B-402, Sunraise Residency',
    line2: 'Linking Road, Bandra West',
    city: 'Mumbai', state: 'Maharashtra', pincode: '400050',
    phone: '+91 99870 22145',
  },
}

sendOrderConfirmation(order, { email: to, name: 'Aditya' })

// Sends are fire-and-forget by design; hold the process open long enough for
// the request to complete and log its result.
await new Promise((r) => setTimeout(r, 6000))
console.log('\ndone — check the inbox (and the spam folder on a first send).')
process.exit(0)
