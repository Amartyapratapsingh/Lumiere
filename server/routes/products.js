import { Router } from 'express'
import { load, mutate, uid } from '../db.js'
import { requireAuth } from '../auth.js'
import { CATEGORIES } from '../catalog.js'

const router = Router()

/** Public shape of a product: cheapest variant surfaced, seller joined in. */
export function decorate(product, db) {
  const seller = db.users.find((u) => u.id === product.sellerId)
  const prices = product.variants.map((v) => v.price)
  const mrps = product.variants.map((v) => v.mrp ?? v.price)
  const price = Math.min(...prices)
  const mrp = Math.max(...mrps)
  const stock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)

  return {
    ...product,
    price,
    mrp,
    discountPct: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    stock,
    inStock: stock > 0,
    hasMultipleSizes: product.variants.length > 1,
    seller: seller
      ? {
          id: seller.id,
          storeName: seller.storeName,
          storeSlug: seller.storeSlug,
          city: seller.city,
          country: seller.country,
          storeRating: seller.storeRating,
          since: seller.since,
          storeBio: seller.storeBio,
        }
      : null,
  }
}

/** Filters, sorting and paging for the shop grid. */
router.get('/', async (req, res) => {
  const db = await load()
  const {
    category,
    q,
    concern,
    brand,
    seller,
    badge,
    sort = 'featured',
    minPrice,
    maxPrice,
    limit = '48',
    page = '1',
  } = req.query

  let items = db.products.filter((p) => p.status === 'active').map((p) => decorate(p, db))

  if (category && category !== 'all') {
    // "gifting" is a cross-category shelf rather than a real category.
    items =
      category === 'gifting'
        ? items.filter((p) => p.concern.includes('Gifting') || p.badges.includes('Gift favourite'))
        : items.filter((p) => p.category === category)
  }
  if (q) {
    const needle = String(q).toLowerCase()
    items = items.filter((p) =>
      [p.name, p.brand, p.tagline, p.origin, p.category, ...(p.concern ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    )
  }
  if (concern) items = items.filter((p) => p.concern.includes(concern))
  if (brand) items = items.filter((p) => p.brand === brand)
  if (seller) items = items.filter((p) => p.seller?.storeSlug === seller)
  if (badge) items = items.filter((p) => p.badges.includes(badge))
  if (minPrice) items = items.filter((p) => p.price >= Number(minPrice))
  if (maxPrice) items = items.filter((p) => p.price <= Number(maxPrice))

  const sorters = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    discount: (a, b) => b.discountPct - a.discountPct,
    featured: (a, b) => b.popularity - a.popularity,
  }
  items.sort(sorters[sort] ?? sorters.featured)

  const total = items.length
  const per = Math.min(Number(limit) || 48, 96)
  const current = Math.max(Number(page) || 1, 1)
  res.json({
    products: items.slice((current - 1) * per, current * per),
    total,
    page: current,
    pages: Math.max(Math.ceil(total / per), 1),
  })
})

/** Filter facets + homepage numbers, derived from live data. */
router.get('/meta', async (_req, res) => {
  const db = await load()
  const active = db.products.filter((p) => p.status === 'active')
  const decorated = active.map((p) => decorate(p, db))

  const counts = (list) => {
    const map = new Map()
    for (const v of list) map.set(v, (map.get(v) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }))
  }

  res.json({
    categories: CATEGORIES.map((c) => ({
      ...c,
      count:
        c.slug === 'gifting'
          ? decorated.filter((p) => p.concern.includes('Gifting') || p.badges.includes('Gift favourite')).length
          : active.filter((p) => p.category === c.slug).length,
    })),
    brands: counts(active.map((p) => p.brand)),
    concerns: counts(active.flatMap((p) => p.concern)),
    origins: counts(active.map((p) => p.origin)),
    priceRange: {
      min: Math.min(...decorated.map((p) => p.price)),
      max: Math.max(...decorated.map((p) => p.price)),
    },
    stats: {
      products: active.length,
      brands: new Set(active.map((p) => p.brand)).size,
      sellers: db.users.filter((u) => u.role === 'seller').length,
      countries: new Set(active.map((p) => p.origin.split('·').pop().trim())).size,
    },
  })
})

/** PDP payload: product, its reviews, and a "you may also like" rail. */
router.get('/:slug', async (req, res) => {
  const db = await load()
  const product = db.products.find((p) => p.slug === req.params.slug && p.status === 'active')
  if (!product) return res.status(404).json({ error: 'Product not found.' })

  const reviews = db.reviews
    .filter((r) => r.productId === product.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const related = db.products
    .filter((p) => p.id !== product.id && p.status === 'active' && p.category === product.category)
    .map((p) => decorate(p, db))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 4)

  res.json({ product: decorate(product, db), reviews, related })
})

/** Consumers can review; one review per person per product. */
router.post('/:slug/reviews', requireAuth, async (req, res) => {
  if (req.user.role !== 'consumer')
    return res.status(403).json({ error: 'Only shopper accounts can leave reviews.' })

  const rating = Number(req.body.rating)
  const title = String(req.body.title ?? '').trim()
  const body = String(req.body.body ?? '').trim()

  // A star rating on its own is enough — the written part is optional.
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Pick a rating from 1 to 5 stars.' })

  const db = await load()
  const product = db.products.find((p) => p.slug === req.params.slug)
  if (!product) return res.status(404).json({ error: 'Product not found.' })
  if (db.reviews.some((r) => r.productId === product.id && r.userId === req.user.id))
    return res.status(409).json({ error: 'You have already reviewed this product.' })

  // Verified badge only if they've actually bought it.
  const purchased = db.orders.some(
    (o) => o.userId === req.user.id && o.items.some((i) => i.productId === product.id)
  )

  const review = {
    id: uid('rev'),
    productId: product.id,
    userId: req.user.id,
    author: req.user.name,
    city: req.user.addresses?.[0]?.city ?? '',
    rating,
    title,
    body,
    verified: purchased,
    createdAt: new Date().toISOString(),
  }

  await mutate((d) => {
    d.reviews.push(review)
    // Keep the headline rating honest by recomputing across all reviews.
    const p = d.products.find((x) => x.id === product.id)
    const all = d.reviews.filter((r) => r.productId === p.id)
    const seededCount = p.reviewCount - all.length + 1
    const weighted = all.reduce((s, r) => s + r.rating, 0) + p.rating * Math.max(seededCount, 0)
    p.reviewCount += 1
    p.rating = Math.round((weighted / (all.length + Math.max(seededCount, 0))) * 10) / 10
  })

  res.status(201).json({ review })
})

export default router
