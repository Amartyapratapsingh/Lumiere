/**
 * Clerk-backed authentication.
 *
 * Clerk owns identity (email, password, social sign-in, MFA). This app keeps
 * owning the *profile*: role, store details, addresses. The two are joined by
 * `user.clerkId`.
 *
 * On the first authenticated request from a new Clerk user we create the local
 * row. If a seeded account already exists with the same email address, we adopt
 * it instead — so signing in as seller@lumiere.in inherits the demo store,
 * complete with its products and order history.
 */
import { clerkMiddleware, getAuth, clerkClient } from '@clerk/express'
import { CLERK_ENABLED, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY } from './config.js'
import { load, mutate, uid } from './db.js'

export const clerkAuth = () =>
  CLERK_ENABLED
    ? clerkMiddleware({ secretKey: CLERK_SECRET_KEY, publishableKey: CLERK_PUBLISHABLE_KEY })
    : (_req, _res, next) => next()

const primaryEmail = (u) =>
  u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
  u.emailAddresses?.[0]?.emailAddress ??
  ''

const fullName = (u) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || 'Lumière shopper'

/**
 * Resolve the local user for a Clerk session, creating or adopting as needed.
 * Returns `{ user, created }` — `created` drives the welcome email.
 */
async function syncUser(clerkId) {
  const db = await load()

  const existing = db.users.find((u) => u.clerkId === clerkId)
  if (existing) return { user: existing, created: false }

  const clerkUser = await clerkClient.users.getUser(clerkId)
  const email = primaryEmail(clerkUser).toLowerCase()
  const name = fullName(clerkUser)

  // Adopt a seeded account with the same email so demo stores keep their data.
  const adoptable = email ? db.users.find((u) => u.email === email && !u.clerkId) : null

  if (adoptable) {
    const user = await mutate((d) => {
      const u = d.users.find((x) => x.id === adoptable.id)
      u.clerkId = clerkId
      u.name = name || u.name
      u.roleChosen = true // a seeded account already knows what it is
      delete u.passwordHash // identity now lives in Clerk
      return u
    })
    console.log(`[clerk] adopted existing account ${email} (${user.role})`)
    return { user, created: false }
  }

  // Role is chosen straight after sign-up; default to shopper until then.
  const role = clerkUser.publicMetadata?.role === 'seller' ? 'seller' : 'consumer'

  const fresh = {
    id: uid('usr'),
    clerkId,
    role,
    name,
    email,
    phone: clerkUser.primaryPhoneNumber?.phoneNumber ?? '',
    createdAt: new Date().toISOString(),
    ...(role === 'consumer' ? { addresses: [] } : { storeName: '', storeSlug: '', country: 'India' }),
  }

  await mutate((d) => {
    // Guard against two concurrent requests both creating the same user.
    if (!d.users.some((u) => u.clerkId === clerkId)) d.users.push(fresh)
  })

  const db2 = await load()
  return { user: db2.users.find((u) => u.clerkId === clerkId), created: true }
}

/**
 * Populates req.user from the Clerk session. Never rejects — routes decide.
 * `req.justCreated` is set the first time we see a given Clerk user.
 */
export async function attachClerkUser(req, _res, next) {
  if (!CLERK_ENABLED) return next()
  try {
    const { userId } = getAuth(req) ?? {}
    if (!userId) return next()
    const { user, created } = await syncUser(userId)
    req.user = user
    req.justCreated = created
  } catch (err) {
    console.error('[clerk] could not resolve session:', err.message)
  }
  next()
}

/** Mirror the chosen role onto Clerk so it survives in the session token. */
export async function setClerkRole(clerkId, role) {
  try {
    await clerkClient.users.updateUserMetadata(clerkId, { publicMetadata: { role } })
  } catch (err) {
    console.error('[clerk] could not write role metadata:', err.message)
  }
}
