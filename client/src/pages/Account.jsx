import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr, formatDate } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Stat } from '../components/Bits.jsx'
import { STATUS_LABEL, STATUS_TONE } from '../constants.js'

export default function Account() {
  const { user, setUser } = useAuth()
  const cart = useCart()
  const toast = useToast()

  const [orders, setOrders] = useState([])
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone ?? '' })
  const [address, setAddress] = useState(
    user.addresses?.[0] ?? { label: 'Home', fullName: user.name, line1: '', line2: '', city: '', state: '', pincode: '', phone: '' }
  )
  const [busy, setBusy] = useState('')

  useEffect(() => {
    api.orders().then((d) => setOrders(d.orders)).catch(() => {})
  }, [])

  const saveProfile = async (e) => {
    e.preventDefault()
    setBusy('profile')
    try {
      const { user: next } = await api.updateProfile(profile)
      setUser(next)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const saveAddress = async (e) => {
    e.preventDefault()
    setBusy('address')
    try {
      const { user: next } = await api.updateProfile({
        addresses: [{ ...address, id: address.id ?? 'adr_default', isDefault: true }],
      })
      setUser(next)
      toast.success('Address saved')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const spent = orders.reduce((s, o) => s + o.total, 0)
  const set = (setter) => (field) => (e) => setter((v) => ({ ...v, [field]: e.target.value }))
  const setP = set(setProfile)
  const setA = set(setAddress)

  return (
    <div className="page section-tight">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link> <span>/</span> <span aria-current="page">My account</span>
      </nav>
      <h1>Hello, {user.name.split(' ')[0]}</h1>
      <p className="lede">Manage your details, delivery address and recent orders.</p>

      <div className="account-stats">
        <Stat label="Orders placed" value={orders.length} />
        <Stat label="Lifetime spend" value={inr(spent)} />
        <Stat label="Saved items" value={cart.wishlist.length} />
        <Stat label="Member since" value={formatDate(user.createdAt)} />
      </div>

      <div className="account-grid">
        <form className="panel" onSubmit={saveProfile}>
          <h3>Your details</h3>
          <div className="stack" style={{ marginTop: 'var(--gap)' }}>
            <div className="field">
              <label htmlFor="ac-name">Full name</label>
              <input id="ac-name" className="input" value={profile.name} onChange={setP('name')} required />
            </div>
            <div className="field">
              <label htmlFor="ac-phone">Phone</label>
              <input id="ac-phone" className="input" value={profile.phone} onChange={setP('phone')} />
            </div>
            <div className="field">
              <label htmlFor="ac-email">Email</label>
              <input id="ac-email" className="input" value={user.email} disabled />
              <span className="hint">Email can’t be changed on a demo account.</span>
            </div>
            <button className="btn" disabled={busy === 'profile'}>
              {busy === 'profile' ? <span className="spinner" /> : 'Save details'}
            </button>
          </div>
        </form>

        <form className="panel" onSubmit={saveAddress}>
          <h3>Default delivery address</h3>
          <div className="form-grid" style={{ marginTop: 'var(--gap)' }}>
            <div className="field span-2">
              <label htmlFor="ad-name">Recipient</label>
              <input id="ad-name" className="input" value={address.fullName ?? ''} onChange={setA('fullName')} />
            </div>
            <div className="field span-2">
              <label htmlFor="ad-l1">Address line 1</label>
              <input id="ad-l1" className="input" value={address.line1 ?? ''} onChange={setA('line1')} />
            </div>
            <div className="field span-2">
              <label htmlFor="ad-l2">Address line 2</label>
              <input id="ad-l2" className="input" value={address.line2 ?? ''} onChange={setA('line2')} />
            </div>
            <div className="field">
              <label htmlFor="ad-city">City</label>
              <input id="ad-city" className="input" value={address.city ?? ''} onChange={setA('city')} />
            </div>
            <div className="field">
              <label htmlFor="ad-state">State</label>
              <input id="ad-state" className="input" value={address.state ?? ''} onChange={setA('state')} />
            </div>
            <div className="field">
              <label htmlFor="ad-pin">PIN code</label>
              <input id="ad-pin" className="input" value={address.pincode ?? ''} onChange={setA('pincode')} maxLength={6} inputMode="numeric" />
            </div>
            <div className="field">
              <label htmlFor="ad-phone">Phone</label>
              <input id="ad-phone" className="input" value={address.phone ?? ''} onChange={setA('phone')} />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 'var(--gap)' }} disabled={busy === 'address'}>
            {busy === 'address' ? <span className="spinner" /> : 'Save address'}
          </button>
        </form>
      </div>

      <section style={{ marginTop: 'var(--gap-lg)' }}>
        <div className="section-head">
          <h2>Recent orders</h2>
          <Link to="/orders" className="link-arrow">All orders</Link>
        </div>

        {orders.length === 0 ? (
          <p className="muted">Nothing ordered yet.</p>
        ) : (
          <div className="stack">
            {orders.slice(0, 3).map((o) => (
              <Link key={o.id} to={`/order/${o.code}`} className="panel spread account-order">
                <div>
                  <strong>{o.code}</strong>
                  <p className="small muted">
                    {formatDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="row">
                  <span className={`badge ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                  <strong>{inr(o.total)}</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
