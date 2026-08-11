/**
 * Rebuilds server/data/db.json from server/catalog.js.
 * Destructive by design — run `npm run seed` to reset the demo to a known state.
 */
import bcrypt from 'bcryptjs'
import { replaceAll, uid } from './db.js'
import { PRODUCTS, SELLERS, REVIEWS } from './catalog.js'

const hash = (pw) => bcrypt.hashSync(pw, 10)

/** Deterministic-ish pseudo-random so seeded stats look stable between runs. */
function seededRandom(seed) {
  let x = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
}

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString()

async function seed() {
  const users = []
  const sellerIdByKey = {}

  for (const s of SELLERS) {
    const id = uid('usr')
    sellerIdByKey[s.key] = id
    users.push({
      id,
      role: 'seller',
      name: s.name,
      email: s.email,
      passwordHash: hash(s.password),
      storeName: s.storeName,
      storeSlug: s.storeSlug,
      storeBio: s.storeBio,
      city: s.city,
      country: s.country,
      phone: s.phone,
      storeRating: s.rating,
      since: s.since,
      createdAt: daysAgo(400),
    })
  }

  // Demo shopper
  const shopperId = uid('usr')
  users.push({
    id: shopperId,
    role: 'consumer',
    name: 'Ananya Sharma',
    email: 'shopper@lumiere.in',
    passwordHash: hash('shop123'),
    phone: '+91 99870 22145',
    createdAt: daysAgo(120),
    addresses: [
      {
        id: uid('adr'),
        label: 'Home',
        fullName: 'Ananya Sharma',
        line1: 'B-402, Sunraise Residency',
        line2: 'Linking Road, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        phone: '+91 99870 22145',
        isDefault: true,
      },
    ],
  })

  const products = PRODUCTS.map((p, i) => {
    const rand = seededRandom(p.slug)
    const variants = p.variants.map((v) => ({ id: uid('var'), ...v }))
    return {
      id: uid('prd'),
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      sellerId: sellerIdByKey[p.seller],
      category: p.category,
      origin: p.origin,
      tagline: p.tagline,
      description: p.description,
      notes: p.notes ?? null,
      howToUse: p.howToUse,
      ingredients: p.ingredients,
      images: p.images,
      variants,
      badges: p.badges ?? [],
      concern: p.concern ?? [],
      rating: p.rating,
      reviewCount: p.reviewCount,
      // Used to order the "Hot picks" rail — higher is hotter.
      popularity: Math.round(p.reviewCount * p.rating + rand() * 120),
      status: 'active',
      createdAt: daysAgo(300 - i * 4),
    }
  })

  const productBySlug = Object.fromEntries(products.map((p) => [p.slug, p]))

  const reviews = []
  for (const [slug, list] of Object.entries(REVIEWS)) {
    const product = productBySlug[slug]
    if (!product) continue
    list.forEach((r, i) => {
      reviews.push({
        id: uid('rev'),
        productId: product.id,
        userId: null,
        author: r.author,
        city: r.city,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: true,
        createdAt: daysAgo(60 - i * 9),
      })
    })
  }

  // A couple of historic orders so the seller dashboard is not empty on day one.
  const pick = (slug, variantIndex, qty) => {
    const p = productBySlug[slug]
    const v = p.variants[variantIndex]
    return {
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      image: p.images[0],
      sellerId: p.sellerId,
      variantId: v.id,
      variantLabel: v.label,
      price: v.price,
      qty,
      status: 'delivered',
    }
  }

  const buildOrder = ({ code, items, days, status }) => {
    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0)
    const shipping = subtotal >= 2500 ? 0 : 149
    const duty = Math.round(subtotal * 0.05)
    return {
      id: uid('ord'),
      code,
      userId: shopperId,
      items: items.map((it) => ({ ...it, status })),
      subtotal,
      shipping,
      importDuty: duty,
      total: subtotal + shipping + duty,
      address: {
        fullName: 'Ananya Sharma',
        line1: 'B-402, Sunraise Residency',
        line2: 'Linking Road, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        phone: '+91 99870 22145',
      },
      paymentMethod: 'Card ending 4291',
      status,
      createdAt: daysAgo(days),
    }
  }

  const orders = [
    buildOrder({ code: 'LM-24801', items: [pick('oud-mood-elixir', 2, 1), pick('rose-quartz-mist', 0, 1)], days: 46, status: 'delivered' }),
    buildOrder({ code: 'LM-24955', items: [pick('barrier-repair-cream', 0, 2)], days: 21, status: 'delivered' }),
    buildOrder({ code: 'LM-25102', items: [pick('velvet-matte-lipstick', 1, 1), pick('lip-gloss-edit', 0, 1)], days: 9, status: 'shipped' }),
    buildOrder({ code: 'LM-25187', items: [pick('mystique-noir', 0, 1)], days: 3, status: 'processing' }),
    buildOrder({ code: 'LM-25203', items: [pick('hyaluronic-glow-serum', 1, 1), pick('bamboo-hydra-gel', 0, 1)], days: 1, status: 'placed' }),
  ]

  await replaceAll({ users, products, orders, reviews, sessions: [] })

  console.log('Seeded Lumière:')
  console.log(`  ${users.length} users (${SELLERS.length} sellers + 1 shopper)`)
  console.log(`  ${products.length} products across 4 categories`)
  console.log(`  ${reviews.length} reviews, ${orders.length} orders`)
  console.log('\nDemo logins')
  console.log('  Consumer  shopper@lumiere.in / shop123')
  console.log('  Seller    seller@lumiere.in  / seller123   (Attar House Dubai)')
  console.log('  Seller    seoul@lumiere.in   / seller123   (Seoul Skin Atelier)')
  console.log('  Seller    noir@lumiere.in    / seller123   (Maison Noir)')
}

seed()
