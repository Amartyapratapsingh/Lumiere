import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SignIn } from '@clerk/clerk-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { CLERK_ENABLED } from '../clerkConfig.js'
import { IconArrow, IconStore, IconUser } from '../components/Icons.jsx'

const DEMO = [
  { role: 'Shopper', email: 'shopper@lumiere.in', password: 'shop123', note: 'Browse, buy, track orders' },
  { role: 'Seller', email: 'seller@lumiere.in', password: 'seller123', note: 'Attar House Dubai' },
]

/**
 * These credentials are published in the README, so the shortcut buttons only
 * appear in development. A production build never renders them.
 */
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true'

/** The built-in email + password form, used until Clerk keys are configured. */
function PasswordForm() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login({ email, password })
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`)
      const from = location.state?.from
      navigate(from && from !== '/login' ? from : user.role === 'seller' ? '/seller' : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="stack" style={{ marginTop: 'var(--gap-md)' }}>
        {error && <div className="notice notice-error">{error}</div>}

        <div className="field">
          <label htmlFor="lg-email">Email</label>
          <input
            id="lg-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="lg-pass">Password</label>
          <input
            id="lg-pass"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn btn-lg btn-block" disabled={busy}>
          {busy ? <span className="spinner" /> : <>Sign in <IconArrow size={16} /></>}
        </button>
      </form>

      <p className="auth-alt">
        New here? <Link to="/signup" className="link-arrow">Create an account</Link>
      </p>

      {SHOW_DEMO && (
      <div className="demo-box">
        <p className="eyebrow">Demo accounts</p>
        {DEMO.map((d) => (
          <button
            key={d.email}
            type="button"
            className="demo-row"
            onClick={() => {
              setEmail(d.email)
              setPassword(d.password)
              setError('')
            }}
          >
            <span className="demo-icon">
              {d.role === 'Seller' ? <IconStore size={16} /> : <IconUser size={16} />}
            </span>
            <span className="grow">
              <strong>{d.role}</strong>
              <span className="small muted"> — {d.note}</span>
              <br />
              <code className="small">{d.email} / {d.password}</code>
            </span>
            <span className="small link-arrow">Use</span>
          </button>
        ))}
      </div>
      )}
    </>
  )
}

export default function Login() {
  const location = useLocation()

  return (
    <div className="auth">
      <div className="auth-visual">
        <img src="/images/editorial/gloss-close.jpg" alt="" />
        <div className="auth-visual-body">
          <span className="logo logo-light">Lumière<span className="logo-mark">®</span></span>
          <h2>Imported beauty, without the guesswork.</h2>
          <p>
            Sealed stock, verified batch codes and customs settled before your parcel is even dispatched.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in</h1>
          <p className="muted">Shoppers and sellers both sign in here.</p>

          {CLERK_ENABLED ? (
            <div className="clerk-mount">
              <SignIn
                routing="virtual"
                signUpUrl="/signup"
                fallbackRedirectUrl={location.state?.from ?? '/'}
              />
            </div>
          ) : (
            <PasswordForm />
          )}
        </div>
      </div>
    </div>
  )
}
