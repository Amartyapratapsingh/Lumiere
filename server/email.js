/**
 * Transactional email via Resend.
 *
 * Every send is fire-and-forget: a mail failure must never break a checkout, so
 * nothing here is awaited by a request handler and every error is swallowed
 * after logging. With no RESEND_API_KEY set, messages are printed to the
 * terminal instead — the app behaves identically, you just read the mail there.
 */
import { Resend } from 'resend'
import {
  RESEND_API_KEY, RESEND_ENABLED, RESEND_FROM, SELLER_ALERT_OVERRIDE, PUBLIC_URL,
} from './config.js'

const resend = RESEND_ENABLED ? new Resend(RESEND_API_KEY) : null

const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number(n) || 0)

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

async function send({ to, subject, html }) {
  const address = (to ?? '').trim().toLowerCase()
  if (!address) return

  // Without a key nothing leaves the machine, so log everything — that's how
  // you inspect the flow while developing.
  if (!resend) {
    console.log(`[email → ${address}] ${subject}   (console only — set RESEND_API_KEY to send)`)
    return
  }

  // Seeded demo accounts use fake @lumiere.in addresses that would hard-bounce.
  const recipient = address.endsWith('@lumiere.in') ? SELLER_ALERT_OVERRIDE : address
  if (!recipient) {
    console.log(
      `[email] skipped "${subject}" — ${address} is a demo address. ` +
        'Set SELLER_ALERT_OVERRIDE in .env to receive these.'
    )
    return
  }

  try {
    const { error } = await resend.emails.send({ from: RESEND_FROM, to: recipient, subject, html })
    if (error) console.error(`[email] ${recipient}: ${error.message ?? JSON.stringify(error)}`)
    else console.log(`[email] sent "${subject}" to ${recipient}`)
  } catch (err) {
    console.error(`[email] ${recipient}: ${err.message}`)
  }
}

/* ───────────────────────── shared layout ───────────────────────── */

const shell = ({ preheader, heading, intro, body, cta }) => `
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#12263a;">
  <span style="display:none;font-size:1px;color:#eef5fb;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef5fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 18px rgba(16,41,63,.08);">
        <tr><td style="background:#10293f;padding:22px 28px;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;letter-spacing:-.3px;">Lumière</span>
          <span style="font-size:10px;color:#7cc0e8;vertical-align:super;">®</span>
        </td></tr>
        <tr><td style="padding:30px 28px 8px;">
          <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#10293f;line-height:1.25;">${heading}</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#5c7286;">${intro}</p>
        </td></tr>
        <tr><td style="padding:0 28px;">${body}</td></tr>
        ${cta ? `<tr><td style="padding:26px 28px 4px;">
          <a href="${cta.href}" style="display:inline-block;background:#10293f;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;">${esc(cta.label)}</a>
        </td></tr>` : ''}
        <tr><td style="padding:28px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a8b9;border-top:1px solid #e2edf5;padding-top:16px;">
            Lumière · imported beauty, delivered across India.<br>
            A demonstration store — no payment was taken and no goods will ship.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const itemRows = (items) =>
  items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2edf5;">
        <strong style="font-size:14px;color:#12263a;">${esc(i.name)}</strong><br>
        <span style="font-size:12px;color:#5c7286;">${esc(i.brand)} · ${esc(i.variantLabel)} · Qty ${i.qty}</span>
      </td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #e2edf5;font-size:14px;white-space:nowrap;">
        ${inr(i.price * i.qty)}
      </td>
    </tr>`).join('')

const addressBlock = (a) => `
  <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#5c7286;">
    <strong style="color:#12263a;">Delivering to</strong><br>
    ${esc(a.fullName)}<br>
    ${esc(a.line1)}${a.line2 ? `<br>${esc(a.line2)}` : ''}<br>
    ${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}<br>
    ${esc(a.phone)}
  </p>`

/* ───────────────────────── the four emails ───────────────────────── */

/** 1. Order confirmation → shopper. */
export function sendOrderConfirmation(order, buyer) {
  const totals = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;font-size:14px;">
      <tr><td style="padding:3px 0;color:#5c7286;">Subtotal</td><td align="right">${inr(order.subtotal)}</td></tr>
      <tr><td style="padding:3px 0;color:#5c7286;">Import duty &amp; handling</td><td align="right">${inr(order.importDuty)}</td></tr>
      <tr><td style="padding:3px 0;color:#5c7286;">Shipping</td><td align="right">${order.shipping === 0 ? 'Free' : inr(order.shipping)}</td></tr>
      <tr><td style="padding:12px 0 0;border-top:1px solid #e2edf5;"><strong>Total paid</strong></td>
          <td align="right" style="padding:12px 0 0;border-top:1px solid #e2edf5;"><strong>${inr(order.total)}</strong></td></tr>
    </table>`

  send({
    to: buyer?.email,
    subject: `Your Lumière order ${order.code} is confirmed`,
    html: shell({
      preheader: `Order ${order.code} · ${inr(order.total)}`,
      heading: 'Thank you — your order is in.',
      intro: `Order <strong>${esc(order.code)}</strong> is confirmed. Customs duty is already settled, so nothing will be collected at your door. We'll email again the moment it ships.`,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(order.items)}</table>${totals}${addressBlock(order.address)}`,
      cta: { href: `${PUBLIC_URL}/order/${order.code}`, label: 'Track this order' },
    }),
  })
}

/** 2. New-order alert → each seller, with only their own lines. */
export function sendSellerOrderAlert(order, seller, lines) {
  const value = lines.reduce((sum, i) => sum + i.price * i.qty, 0)
  const units = lines.reduce((sum, i) => sum + i.qty, 0)

  send({
    to: seller?.email,
    subject: `New order ${order.code} — ${units} ${units === 1 ? 'item' : 'items'} to pack`,
    html: shell({
      preheader: `${order.code} · ${inr(value)}`,
      heading: 'You have an order to pack.',
      intro: `<strong>${esc(order.address.fullName)}</strong> ordered from ${esc(seller.storeName ?? 'your store')}. Only your items are listed below.`,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(lines)}</table>
        <p style="margin:14px 0 0;font-size:14px;"><strong>Your total: ${inr(value)}</strong></p>
        ${addressBlock(order.address)}`,
      cta: { href: `${PUBLIC_URL}/seller/orders`, label: 'Open your orders' },
    }),
  })
}

/** 3. Welcome → any new account. */
export function sendWelcome(user) {
  const seller = user.role === 'seller'
  send({
    to: user?.email,
    subject: seller ? 'Your Lumière seller account is live' : 'Welcome to Lumière',
    html: shell({
      preheader: seller ? 'Start listing what you import.' : 'Imported beauty, delivered across India.',
      heading: seller ? 'Your store is open.' : `Welcome, ${esc((user.name ?? '').split(' ')[0] || 'there')}.`,
      intro: seller
        ? 'You can list what you import, set your own prices and stock, and fulfil orders from your dashboard. Listing is free.'
        : 'Oud and attar from the Dubai souks, Korean barrier care, Milanese colour — sourced by verified importers, with customs duty settled before dispatch.',
      body: `<p style="margin:0;font-size:14px;line-height:1.7;color:#5c7286;">${
        seller
          ? 'Add your first product with photos, sizes and stock levels, and it goes live to shoppers straight away.'
          : 'Free shipping on orders over ₹2,500, and nothing extra to pay on delivery.'
      }</p>`,
      cta: seller
        ? { href: `${PUBLIC_URL}/seller/products/new`, label: 'Add your first product' }
        : { href: `${PUBLIC_URL}/shop`, label: 'Start shopping' },
    }),
  })
}

/** 4. Shipping status update → shopper, when a seller advances a line. */
export function sendStatusUpdate(order, buyer, item, status) {
  const copy = {
    processing: { heading: 'Your order is being packed.', intro: 'It will be handed to the courier shortly.' },
    shipped: { heading: 'Your order is on its way.', intro: 'It should reach you within 2–5 working days.' },
    delivered: { heading: 'Your order has been delivered.', intro: 'We hope you love it. A rating helps other shoppers.' },
    cancelled: { heading: 'An item has been cancelled.', intro: 'If you were charged, a refund follows within 5 working days.' },
  }[status]
  if (!copy) return

  send({
    to: buyer?.email,
    subject: `${order.code}: ${esc(item.name)} — ${status}`,
    html: shell({
      preheader: copy.heading,
      heading: copy.heading,
      intro: copy.intro,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows([item])}</table>`,
      cta: {
        href: status === 'delivered'
          ? `${PUBLIC_URL}/product/${item.slug}#reviews`
          : `${PUBLIC_URL}/order/${order.code}`,
        label: status === 'delivered' ? 'Rate this product' : 'Track this order',
      },
    }),
  })
}
