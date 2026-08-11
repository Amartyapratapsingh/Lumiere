/**
 * Exercises the seller image-upload endpoint and the rating-only review path
 * against the running API.
 *
 *   node scripts/check-upload.mjs
 */
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'http://127.0.0.1:4000/api'

let passed = 0
const failures = []

function check(label, ok, detail = '') {
  if (ok) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failures.push(label)
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/** Log in and keep the session cookie for subsequent calls. */
async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login failed for ${email}`)
  return (res.headers.get('set-cookie') ?? '').split(';')[0]
}

async function main() {
  console.log('\nSELLER IMAGE UPLOAD')
  const sellerCookie = await login('seller@lumiere.in', 'seller123')

  // A real JPEG lifted from the bundled photography.
  const jpeg = await readFile(join(ROOT, 'client', 'public', 'images', 'products', 'velvet-bloom.jpg'))

  const form = new FormData()
  form.append('images', new Blob([jpeg], { type: 'image/jpeg' }), 'my-product.jpg')

  const up = await fetch(`${API}/seller/uploads`, {
    method: 'POST',
    headers: { cookie: sellerCookie },
    body: form,
  })
  const upData = await up.json()
  check('upload accepted', up.status === 201, `HTTP ${up.status} ${JSON.stringify(upData)}`)
  check('returns a public path', /^\/uploads\/.+\.jpg$/.test(upData.images?.[0] ?? ''), upData.images?.[0])

  // The returned path must actually be served.
  const served = await fetch(`http://127.0.0.1:4000${upData.images[0]}`)
  const servedBytes = Buffer.from(await served.arrayBuffer())
  check('uploaded file is served back', served.ok && servedBytes.length === jpeg.length,
    `${served.status}, ${servedBytes.length} vs ${jpeg.length} bytes`)

  // Non-images must be rejected.
  const badPath = join(ROOT, '.shots', 'not-an-image.txt')
  await writeFile(badPath, 'this is definitely not a photo')
  const badForm = new FormData()
  badForm.append('images', new Blob([await readFile(badPath)], { type: 'text/plain' }), 'note.txt')
  const bad = await fetch(`${API}/seller/uploads`, {
    method: 'POST',
    headers: { cookie: sellerCookie },
    body: badForm,
  })
  check('rejects a non-image', bad.status === 400, `HTTP ${bad.status}`)
  await unlink(badPath).catch(() => {})

  // Shoppers must not be able to upload.
  const shopperCookie = await login('shopper@lumiere.in', 'shop123')
  const forbiddenForm = new FormData()
  forbiddenForm.append('images', new Blob([jpeg], { type: 'image/jpeg' }), 'x.jpg')
  const forbidden = await fetch(`${API}/seller/uploads`, {
    method: 'POST',
    headers: { cookie: shopperCookie },
    body: forbiddenForm,
  })
  check('shoppers cannot upload', forbidden.status === 403, `HTTP ${forbidden.status}`)

  console.log('\nRATING WITHOUT A WRITTEN REVIEW')
  // Ratings are one-per-person-per-product, so find one this shopper hasn't
  // rated yet — otherwise a second run of this script would hit a correct 409.
  const { user: me } = await fetch(`${API}/auth/me`, { headers: { cookie: shopperCookie } }).then((r) => r.json())
  const { products } = await fetch(`${API}/products?limit=96`).then((r) => r.json())

  let target = null
  for (const p of products) {
    const { reviews } = await fetch(`${API}/products/${p.slug}`).then((r) => r.json())
    if (!reviews.some((r) => r.userId === me.id)) {
      target = p
      break
    }
  }
  if (!target) throw new Error('this shopper has already rated every product — run `npm run seed`')
  console.log(`  (rating "${target.name}")`)

  const rateOnly = await fetch(`${API}/products/${target.slug}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: shopperCookie },
    body: JSON.stringify({ rating: 4 }),
  })
  const rateData = await rateOnly.json()
  check('a bare star rating is accepted', rateOnly.status === 201, `HTTP ${rateOnly.status} ${JSON.stringify(rateData)}`)
  check('stored with an empty body', rateData.review?.body === '', JSON.stringify(rateData.review?.body))

  const dupe = await fetch(`${API}/products/${target.slug}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: shopperCookie },
    body: JSON.stringify({ rating: 5 }),
  })
  check('a second rating from the same person is refused', dupe.status === 409, `HTTP ${dupe.status}`)

  const zero = await fetch(`${API}/products/${products[0].slug}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: shopperCookie },
    body: JSON.stringify({ rating: 0 }),
  })
  check('zero stars is rejected', zero.status === 400, `HTTP ${zero.status}`)

  console.log(`\n${'─'.repeat(48)}`)
  console.log(`${passed} passed, ${failures.length} failed`)
  if (failures.length) process.exitCode = 1
}

main().catch((err) => {
  console.error('CRASHED:', err.message)
  process.exit(1)
})
