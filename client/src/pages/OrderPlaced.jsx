import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api, inr, formatDate } from '../api.js'
import { STATUS_LABEL, ORDER_STATUSES } from '../constants.js'
import { IconCheck, IconTruck, IconBox, IconStore } from '../components/Icons.jsx'

const TRACK_STEPS = ['placed', 'processing', 'shipped', 'delivered']

export default function OrderPlaced() {
  const { code } = useParams()
  const location = useLocation()
  // The celebratory copy is only right when arriving straight from checkout;
  // reaching the same route from "My orders" should read as a detail page.
  const justPlaced = Boolean(location.state?.justPlaced)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .order(code)
      .then((d) => setOrder(d.order))
      .catch((err) => setError(err.message))
  }, [code])

  if (error) {
    return (
      <div className="page section">
        <div className="empty">
          <h3>We couldn’t open that order</h3>
          <p>{error}</p>
          <Link to="/orders" className="btn">My orders</Link>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="route-loading">
        <span className="spinner" />
      </div>
    )
  }

  const currentStep = TRACK_STEPS.indexOf(order.status)
  const eta = new Date(new Date(order.createdAt).getTime() + 5 * 86_400_000)

  return (
    <div className="page section-tight">
      {justPlaced ? (
        <div className="order-hero">
          <span className="order-tick"><IconCheck size={26} /></span>
          <h1>Thank you — your order is in.</h1>
          <p className="lede">
            Order <strong>{order.code}</strong> was placed on {formatDate(order.createdAt)}. We have emailed
            a confirmation and will message you when it ships.
          </p>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <Link to="/orders" className="btn">My orders</Link>
            <Link to="/shop" className="btn btn-ghost">Keep shopping</Link>
          </div>
        </div>
      ) : (
        <>
          <nav className="breadcrumbs">
            <Link to="/">Home</Link> <span>/</span>
            <Link to="/orders">My orders</Link> <span>/</span>
            <span aria-current="page">{order.code}</span>
          </nav>
          <div className="spread wrap" style={{ marginBottom: 'var(--gap-lg)' }}>
            <div>
              <h1>Order {order.code}</h1>
              <p className="lede">
                Placed on {formatDate(order.createdAt)} · {order.items.length}{' '}
                {order.items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <Link to="/shop" className="btn btn-ghost">Keep shopping</Link>
          </div>
        </>
      )}

      {order.status !== 'cancelled' && (
        <div className="tracker panel">
          {TRACK_STEPS.map((step, i) => (
            <div key={step} className={`tracker-step ${i <= currentStep ? 'is-done' : ''}`}>
              <span className="tracker-dot">
                {i < currentStep ? <IconCheck size={13} /> : i === currentStep ? <span className="pulse" /> : null}
              </span>
              <div>
                <strong>{STATUS_LABEL[step]}</strong>
                {i === TRACK_STEPS.length - 1 && (
                  <span className="small muted">
                    {order.status === 'delivered' ? 'Complete' : `Expected ${formatDate(eta)}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="order-detail">
        <section className="panel">
          <h3>Items</h3>
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.variantId}>
                <Link to={`/product/${item.slug}`}>
                  <img src={item.image} alt="" />
                </Link>
                <div className="grow">
                  <p className="small muted">{item.brand}</p>
                  <Link to={`/product/${item.slug}`} className="order-item-name">{item.name}</Link>
                  <p className="small muted">
                    {item.variantLabel} · Qty {item.qty}
                  </p>
                  <span className={`badge ${item.status === 'delivered' ? 'badge-sage' : 'badge-lilac'}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <strong>{inr(item.price * item.qty)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <aside className="stack">
          <div className="panel">
            <h3>Summary</h3>
            <div className="spread small" style={{ marginTop: '0.8rem' }}>
              <span className="muted">Subtotal</span><span>{inr(order.subtotal)}</span>
            </div>
            <div className="spread small">
              <span className="muted">Import duty &amp; handling</span><span>{inr(order.importDuty)}</span>
            </div>
            <div className="spread small">
              <span className="muted">Shipping</span>
              <span>{order.shipping === 0 ? 'Free' : inr(order.shipping)}</span>
            </div>
            <hr className="divider" />
            <div className="spread checkout-total">
              <span>Total paid</span><strong>{inr(order.total)}</strong>
            </div>
            <p className="small muted" style={{ marginTop: '0.6rem' }}>{order.paymentMethod}</p>
          </div>

          <div className="panel">
            <h3>Delivering to</h3>
            <address className="order-address small">
              <strong>{order.address.fullName}</strong>
              <br />
              {order.address.line1}
              {order.address.line2 && (<><br />{order.address.line2}</>)}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              <br />
              {order.address.phone}
            </address>
            <p className="small muted order-note">
              <IconTruck size={14} /> Duty is settled before dispatch — the courier will not ask you for
              anything at the door.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
