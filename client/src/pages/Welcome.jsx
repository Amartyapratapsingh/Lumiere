import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { RolePicker, PENDING_ROLE_KEY } from '../components/RolePicker.jsx'
import { IconArrow } from '../components/Icons.jsx'

/**
 * Shown once, straight after a Clerk sign-up: Clerk knows who you are, but not
 * whether you came here to shop or to sell. Everything else is already set up.
 */
export default function Welcome() {
  const { user, loading, needsRole, chooseRole } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState('consumer')
  const [store, setStore] = useState({ storeName: '', city: '', country: '', storeBio: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Pick up the choice made on the sign-up screen before Clerk redirected.
  useEffect(() => {
    try {
      const pending = localStorage.getItem(PENDING_ROLE_KEY)
      if (pending === 'seller' || pending === 'consumer') setRole(pending)
    } catch {}
  }, [])

  if (loading) {
    return (
      <div className="route-loading">
        <span className="spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!needsRole) return <Navigate to={user.role === 'seller' ? '/seller' : '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const next = await chooseRole({ role, ...store })
      try {
        localStorage.removeItem(PENDING_ROLE_KEY)
      } catch {}
      toast.success(
        next.role === 'seller' ? 'Your store is open — add your first product.' : 'You’re all set.'
      )
      navigate(next.role === 'seller' ? '/seller' : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page section-tight">
      <div className="welcome">
        <span className="eyebrow">One last thing</span>
        <h1>What brings you to Lumière, {user.name?.split(' ')[0] || 'there'}?</h1>
        <p className="lede">
          This decides what you see. You can always open a second account for the other side later.
        </p>

        <form onSubmit={submit} className="stack" style={{ marginTop: 'var(--gap-lg)' }}>
          {error && <div className="notice notice-error">{error}</div>}

          <RolePicker value={role} onChange={setRole} />

          {role === 'seller' && (
            <div className="panel">
              <h3>About your store</h3>
              <div className="form-grid" style={{ marginTop: 'var(--gap)' }}>
                <div className="field span-2">
                  <label htmlFor="w-store">Store name</label>
                  <input
                    id="w-store"
                    className="input"
                    value={store.storeName}
                    onChange={(e) => setStore((s) => ({ ...s, storeName: e.target.value }))}
                    placeholder="e.g. Attar House Dubai"
                    required
                  />
                  <span className="hint">This is what shoppers see on your product pages.</span>
                </div>
                <div className="field">
                  <label htmlFor="w-city">City</label>
                  <input
                    id="w-city"
                    className="input"
                    value={store.city}
                    onChange={(e) => setStore((s) => ({ ...s, city: e.target.value }))}
                    placeholder="Deira, Dubai"
                  />
                </div>
                <div className="field">
                  <label htmlFor="w-country">Country you import from</label>
                  <input
                    id="w-country"
                    className="input"
                    value={store.country}
                    onChange={(e) => setStore((s) => ({ ...s, country: e.target.value }))}
                    placeholder="United Arab Emirates"
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="w-bio">About your store <span className="muted">(optional)</span></label>
                  <textarea
                    id="w-bio"
                    className="textarea"
                    value={store.storeBio}
                    onChange={(e) => setStore((s) => ({ ...s, storeBio: e.target.value }))}
                    placeholder="Where do you source from, and what makes your stock different?"
                  />
                </div>
              </div>
            </div>
          )}

          <button className="btn btn-lg" style={{ justifySelf: 'start' }} disabled={busy}>
            {busy ? <span className="spinner" /> : <>Continue <IconArrow size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
