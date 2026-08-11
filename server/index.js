import express from 'express'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from './db.js'
import { attachUser } from './auth.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import sellerRoutes, { UPLOAD_DIR } from './routes/seller.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = process.env.PORT || 4000

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(attachUser)

// Seller-uploaded product photos. Served from the API so they survive a client
// rebuild and work identically in dev and production.
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/seller', sellerRoutes)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint.' }))

// After `npm run build`, serve the built client from the same origin.
const dist = join(ROOT, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  console.error('[api]', err)
  res.status(500).json({ error: 'Something went wrong on our side.' })
})

const db = await load()
if (!db.products.length) {
  console.warn('\n  Database is empty — run `npm run seed` to load the catalogue.\n')
}

app.listen(PORT, () => {
  console.log(`  Lumière API  →  http://localhost:${PORT}`)
})
