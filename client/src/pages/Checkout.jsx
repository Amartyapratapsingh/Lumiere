import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, inr } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { EmptyState, QtyStepper } from '../components/Bits.jsx'
import { IconBag, IconShield, IconTruck, IconCheck } from '../components/Icons.jsx'

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm' },
  { id: 'card', label: 'Card', hint: 'Visa, Mastercard, RuPay' },
  { id: 'cod', label: 'Cash on delivery', hint: '₹40 handling fee waived' },
]

const BLANK = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
}

export default function Checkout() {
  const cart = useCart()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const saved = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0]
  const [address, setAddress] = useState(() => ({
    ...BLANK,
    ...(saved ?? {}),
    fullName: saved?.fullName ?? user?.name ?? '',
    phone: saved?.phone ?? user?.phone ?? '',
  }))
  const [payment, setPayment] = useState('upi')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({})

  useEffect(() => {
    if (cart.items.length === 0 && !busy) setError('')
  }, [cart.items.length, busy])

  const set = (field) => (e) => setAddress((a) => ({ ...a, [field]: e.target.value }))
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }))

  const invalid = (field) => {
    if (!touched[field]) return false
    if (field === 'pincode') return !/^\d{6}$/.test(address.pincode.trim())
    if (field === 'phone') return address.phone.replace(/\D/g, '').length < 10
    if (field === 'line2') return false
    return !address[field]?.trim()
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { order } = await api.placeOrder({
        items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
        address,
        paymentMethod: PAYMENT_METHODS.find((p) => p.id === payment)?.label,
      })
      cart.clear()
      toast.success(`Order ${order.code} placed`)
      navigate(`/order/${order.code}`, { replace: true, state: { justPlaced: true } })
    } catch (err) {
      setError(err.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="page section">
        <EmptyState
          icon={<IconBag size={24} />}
          title="Your bag is empty"
          action={
            <Link to="/shop" className="btn">
              Start shopping
            </Link>
          }
        >
          Add something to your bag and it will show up here.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="page section-tight">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link> <span>/</span> <span aria-current="page">Checkout</span>
      </nav>
      <h1 className="checkout-title">Checkout</h1>

      {error && (
        <div className="notice notice-error" style={{ marginBottom: 'var(--gap-md)' }}>
          {error}
        </div>
      )}

      <form className="checkout" onSubmit={submit}>
        <div className="checkout-main">
          <section className="panel">
            <h3>Delivery address</h3>
            <div className="form-grid" style={{ marginTop: 'var(--gap)' }}>
              <div className="field span-2">
                <label htmlFor="ck-name">Full name</label>
                <input
                  id="ck-name"
                  className={`input ${invalid('fullName') ? 'field-error' : ''}`}
                  value={address.fullName}
                  onChange={set('fullName')}
                  onBlur={blur('fullName')}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="field span-2">
                <label htmlFor="ck-l1">Flat, house no., building</label>
                <input
                  id="ck-l1"
                  className={`input ${invalid('line1') ? 'field-error' : ''}`}
                  value={address.line1}
                  onChange={set('line1')}
                  onBlur={blur('line1')}
                  autoComplete="address-line1"
                  required
                />
              </div>
              <div className="field span-2">
                <label htmlFor="ck-l2">Area, street, landmark <span className="muted">(optional)</span></label>
                <input
                  id="ck-l2"
                  className="input"
                  value={address.line2}
                  onChange={set('line2')}
                  autoComplete="address-line2"
                />
              </div>
              <div className="field">
                <label htmlFor="ck-city">City</label>
                <input
                  id="ck-city"
                  className={`input ${invalid('city') ? 'field-error' : ''}`}
                  value={address.city}
                  onChange={set('city')}
                  onBlur={blur('city')}
                  autoComplete="address-level2"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="ck-state">State</label>
                <input
                  id="ck-state"
                  className={`input ${invalid('state') ? 'field-error' : ''}`}
                  value={address.state}
                  onChange={set('state')}
                  onBlur={blur('state')}
                  autoComplete="address-level1"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="ck-pin">PIN code</label>
                <input
                  id="ck-pin"
                  className={`input ${invalid('pincode') ? 'field-error' : ''}`}
                  value={address.pincode}
                  onChange={set('pincode')}
                  onBlur={blur('pincode')}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="400050"
                  autoComplete="postal-code"
                  required
                />
                {invalid('pincode') && <span className="hint" style={{ color: 'var(--danger)' }}>Six digits, please.</span>}
              </div>
              <div className="field">
                <label htmlFor="ck-phone">Phone</label>
                <input
                  id="ck-phone"
                  className={`input ${invalid('phone') ? 'field-error' : ''}`}
                  value={address.phone}
                  onChange={set('phone')}
                  onBlur={blur('phone')}
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <h3>Payment</h3>
            <p className="small muted" style={{ marginTop: '0.35rem' }}>
              This is a demonstration store — no payment is actually taken.
            </p>
            <div className="pay-methods">
              {PAYMENT_METHODS.map((m) => (
                <label key={m.id} className={`pay-method ${payment === m.id ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={payment === m.id}
                    onChange={() => setPayment(m.id)}
                  />
                  <span className="pay-radio">{payment === m.id && <IconCheck size={12} />}</span>
                  <span>
                    <strong>{m.label}</strong>
                    <span className="small muted"> — {m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="checkout-side">
          <div className="panel checkout-summary">
            <h3>Order summary</h3>

            <ul className="checkout-items">
              {cart.items.map((i) => (
                <li key={`${i.productId}-${i.variantId}`}>
                  <img src={i.image} alt="" />
                  <div className="grow">
                    <p className="small muted">{i.brand}</p>
                    <strong>{i.name}</strong>
                    <p className="small muted">{i.variantLabel}</p>
                    <div className="checkout-item-foot">
                      <QtyStepper
                        size="sm"
                        value={i.qty}
                        max={Math.min(i.stock ?? 10, 10)}
                        onChange={(q) => cart.setQty(i.productId, i.variantId, q)}
                      />
                      <span>{inr(i.price * i.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <hr className="divider" />

            <div className="spread small"><span className="muted">Subtotal</span><span>{inr(cart.subtotal)}</span></div>
            <div className="spread small"><span className="muted">Import duty &amp; handling (5%)</span><span>{inr(cart.importDuty)}</span></div>
            <div className="spread small">
              <span className="muted">Shipping</span>
              <span>{cart.shipping === 0 ? <em className="free">Free</em> : inr(cart.shipping)}</span>
            </div>

            <hr className="divider" />

            <div className="spread checkout-total">
              <span>Total</span>
              <strong>{inr(cart.total)}</strong>
            </div>

            <button className="btn btn-lg btn-block" disabled={busy}>
              {busy ? <span className="spinner" /> : `Place order · ${inr(cart.total)}`}
            </button>

            <ul className="checkout-assure">
              <li><IconShield size={15} /> Duty paid before dispatch — nothing due on delivery</li>
              <li><IconTruck size={15} /> Delivered in 2–5 working days</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>
  )
}
