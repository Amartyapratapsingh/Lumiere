import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SignUp } from '@clerk/clerk-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { CLERK_ENABLED } from '../clerkConfig.js'
import { RolePicker, PENDING_ROLE_KEY } from '../components/RolePicker.jsx'
import { IconArrow } from '../components/Icons.jsx'

/** Built-in sign-up form, used until Clerk keys are configured. */
function PasswordForm({ role }) {
  const { signup } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    storeName: '', storeBio: '', city: '', country: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await signup({ ...form, role })
      toast.success(`Account created — welcome, ${user.name.split(' ')[0]}`)
      navigate(role === 'seller' ? '/seller' : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {error && <div className="notice notice-error">{error}</div>}

      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="su-name">Full name</label>
          <input id="su-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input id="su-email" className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="su-phone">Phone <span className="muted">(optional)</span></label>
          <input id="su-phone" className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </div>
        <div className="field span-2">
          <label htmlFor="su-pass">Password</label>
          <input
            id="su-pass"
            className="input"
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <span className="hint">At least 6 characters.</span>
        </div>

        {role === 'seller' && (
          <>
            <div className="field span-2">
              <label htmlFor="su-store">Store name</label>
              <input id="su-store" className="input" value={form.storeName} onChange={set('storeName')} placeholder="e.g. Attar House Dubai" required />
              <span className="hint">This is what shoppers see on your product pages.</span>
            </div>
            <div className="field">
              <label htmlFor="su-city">City</label>
              <input id="su-city" className="input" value={form.city} onChange={set('city')} placeholder="Deira, Dubai" />
            </div>
            <div className="field">
              <label htmlFor="su-country">Country you import from</label>
              <input id="su-country" className="input" value={form.country} onChange={set('country')} placeholder="United Arab Emirates" />
            </div>
            <div className="field span-2">
              <label htmlFor="su-bio">About your store <span className="muted">(optional)</span></label>
              <textarea
                id="su-bio"
                className="textarea"
                value={form.storeBio}
                onChange={set('storeBio')}
                placeholder="Where do you source from, and what makes your stock different?"
              />
            </div>
          </>
        )}
      </div>

      <button className="btn btn-lg btn-block" disabled={busy}>
        {busy ? <span className="spinner" /> : <>Create {role === 'seller' ? 'seller' : 'shopper'} account <IconArrow size={16} /></>}
      </button>
    </form>
  )
}

export default function Signup() {
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') === 'seller' ? 'seller' : 'consumer')

  // Clerk doesn't know about our roles, so remember the choice across its
  // redirect and apply it on the welcome step.
  const chooseRole = (next) => {
    setRole(next)
    try {
      localStorage.setItem(PENDING_ROLE_KEY, next)
    } catch {}
  }

  return (
    <div className="auth">
      <div className="auth-visual">
        <img src="/images/editorial/luminous-skin.jpg" alt="" />
        <div className="auth-visual-body">
          <span className="logo logo-light">Lumière<span className="logo-mark">®</span></span>
          <h2>Two kinds of account, one marketplace.</h2>
          <p>
            Shoppers get the storefront. Sellers get a dashboard, stock control and their own store page —
            you can switch what you are here for at any time by opening a second account.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-form auth-form-wide">
          <span className="eyebrow">Create an account</span>
          <h1>Join Lumière</h1>

          <RolePicker value={role} onChange={chooseRole} />

          {CLERK_ENABLED ? (
            <div className="clerk-mount">
              <SignUp routing="virtual" signInUrl="/login" fallbackRedirectUrl="/welcome" />
            </div>
          ) : (
            <PasswordForm role={role} />
          )}

          <p className="auth-alt">
            Already have an account? <Link to="/login" className="link-arrow">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
