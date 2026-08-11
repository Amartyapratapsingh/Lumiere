/** Session handling: an opaque random token in an httpOnly cookie. */
import { randomBytes } from 'node:crypto'
import { load, mutate } from './db.js'

const COOKIE = 'lumiere_sid'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false, // local dev over http
  maxAge: MAX_AGE_MS,
  path: '/',
}

export async function createSession(res, userId) {
  const token = randomBytes(32).toString('hex')
  await mutate((db) => {
    // Drop expired sessions opportunistically so the file doesn't grow forever.
    const cutoff = Date.now() - MAX_AGE_MS
    db.sessions = db.sessions.filter((s) => new Date(s.createdAt).getTime() > cutoff)
    db.sessions.push({ token, userId, createdAt: new Date().toISOString() })
  })
  res.cookie(COOKIE, token, cookieOptions)
  return token
}

export async function destroySession(req, res) {
  const token = req.cookies?.[COOKIE]
  if (token) await mutate((db) => { db.sessions = db.sessions.filter((s) => s.token !== token) })
  res.clearCookie(COOKIE, { path: '/' })
}

/** Strip secrets before anything goes over the wire. */
export function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...rest } = user
  return rest
}

/** Populates req.user when a valid session cookie is present. Never rejects. */
export async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE]
  if (!token) return next()
  const db = await load()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return next()
  if (Date.now() - new Date(session.createdAt).getTime() > MAX_AGE_MS) return next()
  req.user = db.users.find((u) => u.id === session.userId) ?? null
  next()
}

export const requireAuth = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Please sign in to continue.' })

export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' })
  if (req.user.role !== role)
    return res.status(403).json({ error: `This area is for ${role} accounts.` })
  next()
}
