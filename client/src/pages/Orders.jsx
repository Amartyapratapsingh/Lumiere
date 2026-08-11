import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr, formatDate, relativeDate } from '../api.js'
import { EmptyState } from '../components/Bits.jsx'
import { STATUS_LABEL, STATUS_TONE } from '../constants.js'
import { IconBox } from '../components/Icons.jsx'

export default function Orders() {
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    api.orders().then((d) => setOrders(d.orders)).catch(() => setOrders([]))
  }, [])

  if (!orders) {
    return (
      <div className="route-loading">
        <span className="spinner" />
      </div>
    )
  }

  return (
    <div className="page section-tight">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link> <span>/</span> <span aria-current="page">My orders</span>
      </nav>
      <h1>My orders</h1>
      <p className="lede" style={{ marginBottom: 'var(--gap-lg)' }}>
        Every parcel you have ordered, newest first.
      </p>

      {orders.length === 0 ? (
        <EmptyState
          icon={<IconBox size={24} />}
          title="No orders yet"
          action={<Link to="/shop" className="btn">Browse the shop</Link>}
        >
          When you place an order it will appear here with live tracking.
        </EmptyState>
      ) : (
        <div className="stack" style={{ gap: 'var(--gap-md)' }}>
          {orders.map((order) => (
            <article key={order.id} className="order-card panel">
              <header className="order-card-head">
                <div>
                  <span className={`badge ${STATUS_TONE[order.status]}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <h3>{order.code}</h3>
                  <p className="small muted">
                    {formatDate(order.createdAt)} · {relativeDate(order.createdAt)} ·{' '}
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="order-card-total">
                  <strong>{inr(order.total)}</strong>
                  <Link to={`/order/${order.code}`} className="link-arrow">
                    View details
                  </Link>
                </div>
              </header>

              <div className="order-card-thumbs">
                {order.items.map((item) => (
                  <Link key={item.variantId} to={`/product/${item.slug}`} title={item.name}>
                    <img src={item.image} alt={item.name} />
                    {item.qty > 1 && <span className="thumb-qty">×{item.qty}</span>}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
