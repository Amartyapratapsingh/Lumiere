import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { load, mutate, uid } from '../db.js'
import { createSession, destroySession, publicUser, requireAuth } from '../auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (v) => (typeof v === 'string' ? v.trim() : '')

router.post('/signup', async (req, res) => {
  const name = clean(req.body.name)
  const email = clean(req.body.email).toLowerCase()
  const password = req.body.password ?? ''
  const role = req.body.role === 'seller' ? 'seller' : 'consumer'

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'That email address looks invalid.' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const storeName = clean(req.body.storeName)
  if (role === 'seller' && storeName.length < 2)
    return res.status(400).json({ error: 'Sellers need a store name.' })

  const db = await load()
  if (db.users.some((u) => u.email === email))
    return res.status(409).json({ error: 'An account already exists with this email. Try signing in.' })

  const base = {
    id: uid('usr'),
    role,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    phone: clean(req.body.phone),
    createdAt: new Date().toISOString(),
  }

  const user =
    role === 'seller'
      ? {
          ...base,
          storeName,
          storeSlug:
            storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
            `store-${base.id.slice(-6)}`,
          storeBio: clean(req.body.storeBio),
          city: clean(req.body.city),
          country: clean(req.body.country) || 'India',
          storeRating: null,
          since: new Date().getFullYear(),
        }
      : { ...base, addresses: [] }

  await mutate((d) => { d.users.push(user) })
  await createSession(res, user.id)
  res.status(201).json({ user: publicUser(user) })
})

router.post('/login', async (req, res) => {
  const email = clean(req.body.email).toLowerCase()
  const password = req.body.password ?? ''

  const db = await load()
  const user = db.users.find((u) => u.email === email)
  // Same message either way so we don't leak which emails are registered.
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: 'Email or password is incorrect.' })

  await createSession(res, user.id)
  res.json({ user: publicUser(user) })
})

router.post('/logout', async (req, res) => {
  await destroySession(req, res)
  res.json({ ok: true })
})

router.get('/me', (req, res) => res.json({ user: publicUser(req.user) }))

/** Profile edits — consumers manage addresses here too. */
router.patch('/me', requireAuth, async (req, res) => {
  const patch = {}
  for (const field of ['name', 'phone', 'storeName', 'storeBio', 'city', 'country']) {
    if (typeof req.body[field] === 'string') patch[field] = req.body[field].trim()
  }
  if (Array.isArray(req.body.addresses)) patch.addresses = req.body.addresses

  const updated = await mutate((db) => {
    const u = db.users.find((x) => x.id === req.user.id)
    Object.assign(u, patch)
    return u
  })
  res.json({ user: publicUser(updated) })
})

export default router
