import { Router } from 'express'
import { load, mutate, uid } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'
import { sendOrderConfirmation, sendSellerOrderAlert } from '../email.js'

const router = Router()

export const FREE_SHIPPING_OVER = 2500
export const SHIPPING_FLAT = 149
export const DUTY_RATE = 0.05 // flat customs handling on imported goods

const nextOrderCode = (db) => `LM-${25300 + db.orders.length + 1}`

const REQUIRED_ADDRESS_FIELDS = ['fullName', 'line1', 'city', 'state', 'pincode', 'phone']

/** Checkout. Prices and stock are re-read server-side — never trusted from the client. */
router.post('/', requireRole('consumer'), async (req, res) => {
  const lines = Array.isArray(req.body.items) ? req.body.items : []
  if (!lines.length) return res.status(400).json({ error: 'Your cart is empty.' })

  const address = req.body.address ?? {}
  const missing = REQUIRED_ADDRESS_FIELDS.filter((f) => !String(address[f] ?? '').trim())
  if (missing.length)
    return res.status(400).json({ error: `Please complete the delivery address (${missing.join(', ')}).` })
  if (!/^\d{6}$/.test(String(address.pincode).trim()))
    return res.status(400).json({ error: 'Enter a valid 6-digit PIN code.' })

  const db = await load()
  const items = []

  for (const line of lines) {
    const product = db.products.find((p) => p.id === line.productId && p.status === 'active')
    if (!product) return res.status(400).json({ error: 'One of your items is no longer available.' })

    const variant = product.variants.find((v) => v.id === line.variantId) ?? product.variants[0]
    const qty = Math.max(1, Math.min(Number(line.qty) || 1, 10))

    if ((variant.stock ?? 0) < qty)
      return res.status(409).json({
        error: `Only ${variant.stock} left of ${product.name} (${variant.label}). Please adjust the quantity.`,
      })

    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.images[0],
      sellerId: product.sellerId,
      variantId: variant.id,
      variantLabel: variant.label,
      price: variant.price, // server price wins
      qty,
      status: 'placed',
    })
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT
  const importDuty = Math.round(subtotal * DUTY_RATE)

  const order = {
    id: uid('ord'),
    code: nextOrderCode(db),
    userId: req.user.id,
    items,
    subtotal,
    shipping,
    importDuty,
    total: subtotal + shipping + importDuty,
    address: {
      fullName: String(address.fullName).trim(),
      line1: String(address.line1).trim(),
      line2: String(address.line2 ?? '').trim(),
      city: String(address.city).trim(),
      state: String(address.state).trim(),
      pincode: String(address.pincode).trim(),
      phone: String(address.phone).trim(),
    },
    paymentMethod: req.body.paymentMethod || 'Cash on delivery',
    status: 'placed',
    createdAt: new Date().toISOString(),
  }

  await mutate((d) => {
    // Decrement stock atomically with the write.
    for (const item of order.items) {
      const p = d.products.find((x) => x.id === item.productId)
      const v = p.variants.find((x) => x.id === item.variantId)
      v.stock = Math.max(0, (v.stock ?? 0) - item.qty)
    }
    d.orders.push(order)
  })

  // Fire-and-forget: the shopper gets a receipt, each seller gets their lines.
  sendOrderConfirmation(order, req.user)
  const fresh = await load()
  for (const sellerId of new Set(order.items.map((i) => i.sellerId))) {
    const seller = fresh.users.find((u) => u.id === sellerId)
    if (seller) sendSellerOrderAlert(order, seller, order.items.filter((i) => i.sellerId === sellerId))
  }

  res.status(201).json({ order })
})

/** A shopper's own order history. */
router.get('/', requireAuth, async (req, res) => {
  const db = await load()
  const orders = db.orders
    .filter((o) => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ orders })
})

router.get('/:code', requireAuth, async (req, res) => {
  const db = await load()
  const order = db.orders.find((o) => o.code === req.params.code)
  if (!order) return res.status(404).json({ error: 'Order not found.' })

  const isOwner = order.userId === req.user.id
  const isSeller = req.user.role === 'seller' && order.items.some((i) => i.sellerId === req.user.id)
  if (!isOwner && !isSeller) return res.status(403).json({ error: 'Not your order.' })

  // A seller only ever sees their own lines.
  const visible = isOwner ? order : { ...order, items: order.items.filter((i) => i.sellerId === req.user.id) }
  res.json({ order: visible })
})

export default router
