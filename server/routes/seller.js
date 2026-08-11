import { Router } from 'express'
import { mkdirSync } from 'node:fs'
import { extname, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import multer from 'multer'
import { load, mutate, uid } from '../db.js'
import { requireRole } from '../auth.js'
import { decorate } from './products.js'
import { sendStatusUpdate } from '../email.js'

const router = Router()
router.use(requireRole('seller'))

/** Uploaded product photos live outside the client so they survive a rebuild. */
export const UPLOAD_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' }

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}${EXT[file.mimetype] ?? extname(file.originalname) ?? '.jpg'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPG, PNG, WebP or AVIF images are allowed.')),
})

const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled']

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

/** Validates and normalises the product form payload. Returns [fields, error]. */
function parseProduct(body) {
  const name = String(body.name ?? '').trim()
  const brand = String(body.brand ?? '').trim()
  const category = String(body.category ?? '').trim()
  const description = String(body.description ?? '').trim()

  if (name.length < 3) return [null, 'Product name must be at least 3 characters.']
  if (!brand) return [null, 'Please enter a brand name.']
  if (!['fragrance', 'skincare', 'makeup', 'bath-body'].includes(category))
    return [null, 'Pick a valid category.']
  if (description.length < 20) return [null, 'Please write a description of at least 20 characters.']

  const rawVariants = Array.isArray(body.variants) ? body.variants : []
  const variants = []
  for (const v of rawVariants) {
    const label = String(v.label ?? '').trim()
    const price = Number(v.price)
    const mrp = v.mrp === '' || v.mrp == null ? null : Number(v.mrp)
    const stock = Number(v.stock)
    if (!label) continue
    if (!(price > 0)) return [null, `Enter a price above zero for "${label}".`]
    if (mrp != null && mrp < price) return [null, `MRP cannot be lower than the selling price for "${label}".`]
    if (!(stock >= 0)) return [null, `Stock cannot be negative for "${label}".`]
    variants.push({ id: v.id || uid('var'), label, price, mrp: mrp ?? price, stock: Math.floor(stock) })
  }
  if (!variants.length) return [null, 'Add at least one size or shade with a price.']

  const images = (Array.isArray(body.images) ? body.images : []).map((s) => String(s).trim()).filter(Boolean)
  if (!images.length) return [null, 'Choose at least one product image.']

  return [
    {
      name,
      brand,
      category,
      description,
      images,
      variants,
      origin: String(body.origin ?? '').trim() || 'Imported',
      tagline: String(body.tagline ?? '').trim(),
      howToUse: String(body.howToUse ?? '').trim(),
      ingredients: String(body.ingredients ?? '').trim(),
      notes: body.notes && typeof body.notes === 'object' ? body.notes : null,
      badges: Array.isArray(body.badges) ? body.badges.filter(Boolean) : [],
      concern: Array.isArray(body.concern) ? body.concern.filter(Boolean) : [],
      status: body.status === 'draft' ? 'draft' : 'active',
    },
    null,
  ]
}

/**
 * Upload product photos from the seller's own machine.
 * Returns public paths ready to drop straight into a product's `images`.
 */
router.post('/uploads', (req, res) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each image must be under 8 MB.'
          : err.code === 'LIMIT_FILE_COUNT'
            ? 'You can upload at most 6 images at a time.'
            : err.message || 'That upload failed.'
      return res.status(400).json({ error: message })
    }
    if (!req.files?.length) return res.status(400).json({ error: 'No image was selected.' })
    res.status(201).json({ images: req.files.map((f) => `/uploads/${f.filename}`) })
  })
})

router.get('/products', async (req, res) => {
  const db = await load()
  const products = db.products
    .filter((p) => p.sellerId === req.user.id)
    .map((p) => decorate(p, db))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ products })
})

router.post('/products', async (req, res) => {
  const [fields, error] = parseProduct(req.body)
  if (error) return res.status(400).json({ error })

  const db = await load()
  let slug = slugify(fields.name)
  if (db.products.some((p) => p.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const product = {
    id: uid('prd'),
    slug,
    sellerId: req.user.id,
    ...fields,
    rating: 0,
    reviewCount: 0,
    popularity: 0,
    createdAt: new Date().toISOString(),
  }

  await mutate((d) => { d.products.push(product) })
  res.status(201).json({ product: decorate(product, await load()) })
})

router.patch('/products/:id', async (req, res) => {
  const db = await load()
  const existing = db.products.find((p) => p.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Product not found.' })
  if (existing.sellerId !== req.user.id) return res.status(403).json({ error: 'That is not your product.' })

  // Status-only toggle from the list view.
  if (Object.keys(req.body).length === 1 && req.body.status) {
    const status = req.body.status === 'active' ? 'active' : 'draft'
    const updated = await mutate((d) => {
      const p = d.products.find((x) => x.id === req.params.id)
      p.status = status
      return p
    })
    return res.json({ product: decorate(updated, await load()) })
  }

  const [fields, error] = parseProduct(req.body)
  if (error) return res.status(400).json({ error })

  const updated = await mutate((d) => {
    const p = d.products.find((x) => x.id === req.params.id)
    Object.assign(p, fields, { updatedAt: new Date().toISOString() })
    return p
  })
  res.json({ product: decorate(updated, await load()) })
})

router.delete('/products/:id', async (req, res) => {
  const db = await load()
  const existing = db.products.find((p) => p.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Product not found.' })
  if (existing.sellerId !== req.user.id) return res.status(403).json({ error: 'That is not your product.' })

  // Products that appear in orders are archived, not deleted, so history survives.
  const ordered = db.orders.some((o) => o.items.some((i) => i.productId === existing.id))
  await mutate((d) => {
    if (ordered) {
      d.products.find((p) => p.id === existing.id).status = 'archived'
    } else {
      d.products = d.products.filter((p) => p.id !== existing.id)
      d.reviews = d.reviews.filter((r) => r.productId !== existing.id)
    }
  })
  res.json({ ok: true, archived: ordered })
})

/** Incoming orders, reduced to just this seller's lines. */
router.get('/orders', async (req, res) => {
  const db = await load()
  const orders = db.orders
    .map((o) => {
      const mine = o.items.filter((i) => i.sellerId === req.user.id)
      if (!mine.length) return null
      const buyer = db.users.find((u) => u.id === o.userId)
      return {
        id: o.id,
        code: o.code,
        createdAt: o.createdAt,
        address: o.address,
        paymentMethod: o.paymentMethod,
        buyerName: buyer?.name ?? o.address.fullName,
        items: mine,
        subtotal: mine.reduce((s, i) => s + i.price * i.qty, 0),
        units: mine.reduce((s, i) => s + i.qty, 0),
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ orders })
})

/** Advance the fulfilment status of one line in one order. */
router.patch('/orders/:code/items/:variantId', async (req, res) => {
  const status = String(req.body.status ?? '')
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' })

  const db = await load()
  const order = db.orders.find((o) => o.code === req.params.code)
  if (!order) return res.status(404).json({ error: 'Order not found.' })

  const line = order.items.find((i) => i.variantId === req.params.variantId && i.sellerId === req.user.id)
  if (!line) return res.status(403).json({ error: 'That line is not yours to update.' })

  const buyer = db.users.find((u) => u.id === order.userId)

  const updated = await mutate((d) => {
    const o = d.orders.find((x) => x.code === req.params.code)
    const it = o.items.find((i) => i.variantId === req.params.variantId && i.sellerId === req.user.id)
    it.status = status
    // The order headline reflects the least-advanced line.
    const rank = (s) => ORDER_STATUSES.indexOf(s)
    const live = o.items.filter((i) => i.status !== 'cancelled')
    o.status = live.length ? live.reduce((a, b) => (rank(a.status) <= rank(b.status) ? a : b)).status : 'cancelled'
    return o
  })

  sendStatusUpdate(updated, buyer, line, status)
  res.json({ order: { code: updated.code, status: updated.status }, itemStatus: status })
})

/** Dashboard numbers. */
router.get('/stats', async (req, res) => {
  const db = await load()
  const myProducts = db.products.filter((p) => p.sellerId === req.user.id)
  const myLines = db.orders.flatMap((o) =>
    o.items.filter((i) => i.sellerId === req.user.id).map((i) => ({ ...i, createdAt: o.createdAt, code: o.code }))
  )

  const earning = myLines.filter((l) => l.status !== 'cancelled')
  const revenue = earning.reduce((s, l) => s + l.price * l.qty, 0)
  const units = earning.reduce((s, l) => s + l.qty, 0)

  const thirtyDaysAgo = Date.now() - 30 * 86_400_000
  const recent = earning.filter((l) => new Date(l.createdAt).getTime() >= thirtyDaysAgo)

  const bySlug = new Map()
  for (const l of earning) {
    const cur = bySlug.get(l.slug) ?? { name: l.name, image: l.image, units: 0, revenue: 0 }
    cur.units += l.qty
    cur.revenue += l.price * l.qty
    bySlug.set(l.slug, cur)
  }

  // Revenue for the last 8 weeks, oldest first — drives the dashboard sparkline.
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = Date.now() - i * 7 * 86_400_000
    const start = end - 7 * 86_400_000
    const total = earning
      .filter((l) => {
        const t = new Date(l.createdAt).getTime()
        return t >= start && t < end
      })
      .reduce((s, l) => s + l.price * l.qty, 0)
    return { weeksAgo: i, total }
  }).reverse()

  res.json({
    revenue,
    units,
    orderCount: new Set(myLines.map((l) => l.code)).size,
    revenue30d: recent.reduce((s, l) => s + l.price * l.qty, 0),
    pending: myLines.filter((l) => l.status === 'placed' || l.status === 'processing').length,
    liveProducts: myProducts.filter((p) => p.status === 'active').length,
    draftProducts: myProducts.filter((p) => p.status === 'draft').length,
    lowStock: myProducts
      .filter((p) => p.status === 'active')
      .map((p) => ({ name: p.name, slug: p.slug, stock: p.variants.reduce((s, v) => s + (v.stock ?? 0), 0) }))
      .filter((p) => p.stock <= 10)
      .sort((a, b) => a.stock - b.stock),
    topProducts: [...bySlug.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    weekly: weeks,
  })
})

export default router
