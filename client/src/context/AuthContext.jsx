import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the session on boot — the cookie is httpOnly so we have to ask.
  useEffect(() => {
    let alive = true
    api
      .me()
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isSeller: user?.role === 'seller',
      isConsumer: user?.role === 'consumer',
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
      async logout() {
        await api.logout()
        setUser(null)
      },
      async refresh() {
        const { user: next } = await api.me()
        setUser(next)
        return next
      },
      setUser,
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
