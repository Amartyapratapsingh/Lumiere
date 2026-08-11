import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react'
import { api, setTokenGetter } from '../api.js'
import { CLERK_ENABLED } from '../clerkConfig.js'

const AuthContext = createContext(null)

/**
 * Bridges whichever auth system is live to the rest of the app.
 *
 * Clerk owns identity; this app owns the profile (role, store, addresses). The
 * shape exposed here is identical in both modes, so no page needs to care which
 * one is running.
 */
function Provider({ children, clerk }) {
  const [user, setUser] = useState(null)
  const [needsRole, setNeedsRole] = useState(false)
  const [loading, setLoading] = useState(true)

  // Let api.js attach the Clerk session token to every request.
  useEffect(() => {
    setTokenGetter(clerk?.getToken ?? null)
  }, [clerk?.getToken])

  const refresh = async () => {
    const { user: next, needsRole: needs } = await api.me()
    setUser(next)
    setNeedsRole(Boolean(needs))
    return next
  }

  useEffect(() => {
    let alive = true

    // In Clerk mode, wait for Clerk to restore its session before asking our API
    // who we are — otherwise the request goes out unauthenticated.
    if (CLERK_ENABLED && !clerk?.isLoaded) return

    if (CLERK_ENABLED && !clerk?.isSignedIn) {
      setUser(null)
      setNeedsRole(false)
      setLoading(false)
      return
    }

    setLoading(true)
    refresh()
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [clerk?.isLoaded, clerk?.isSignedIn])

  const value = useMemo(
    () => ({
      user,
      loading,
      needsRole,
      provider: CLERK_ENABLED ? 'clerk' : 'password',
      isSeller: user?.role === 'seller',
      isConsumer: user?.role === 'consumer',

      /** Password mode only — Clerk handles this in its own component. */
      async login(credentials) {
        const { user: next } = await api.login(credentials)
        setUser(next)
        return next
      },
      async signup(payload) {
        const { user: next } = await api.signup(payload)
        setUser(next)
        return next
      },

      /** Records shopper vs seller straight after a Clerk sign-up. */
      async chooseRole(payload) {
        const { user: next } = await api.setRole(payload)
        setUser(next)
        setNeedsRole(false)
        return next
      },

      async logout() {
        if (CLERK_ENABLED) {
          await clerk.signOut()
        } else {
          await api.logout()
        }
        setUser(null)
        setNeedsRole(false)
      },

      refresh,
      setUser,
    }),
    [user, loading, needsRole, clerk]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Reads Clerk's hooks — only mounted when Clerk is actually configured. */
function ClerkBridge({ children }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth()
  const { signOut } = useClerk()
  const clerk = useMemo(
    () => ({ isLoaded, isSignedIn, getToken, signOut }),
    [isLoaded, isSignedIn, getToken, signOut]
  )
  return <Provider clerk={clerk}>{children}</Provider>
}

export function AuthProvider({ children }) {
  return CLERK_ENABLED ? <ClerkBridge>{children}</ClerkBridge> : <Provider>{children}</Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
