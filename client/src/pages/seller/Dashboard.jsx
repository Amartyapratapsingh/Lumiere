import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr, formatDate } from '../../api.js'
import { SellerShell } from './SellerNav.jsx'
import { STATUS_LABEL, STATUS_TONE } from '../../constants.js'
import { IconArrow, IconBox, IconPlus } from '../../components/Icons.jsx'

/** Eight-week revenue bars. Heights are relative to the best week. */
function RevenueChart({ weekly }) {
  const peak = Math.max(...weekly.map((w) => w.total), 1)
  return (
    <div className="chart">
      <div className="chart-bars">
        {weekly.map((w, i) => {
          const pct = (w.total / peak) * 100
          return (
            <div key={i} className="chart-col">
              <span
                className="chart-bar"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${inr(w.total)} — ${w.weeksAgo === 0 ? 'this week' : `${w.weeksAgo} weeks ago`}`}
              />
              <span className="chart-tick small">{w.weeksAgo === 0 ? 'Now' : `-${w.weeksAgo}w`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SellerDashboard() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.sellerStats().then(setStats).catch((e) => setError(e.message))
    api.sellerOrders().then((d) => setOrders(d.orders)).catch(() => {})
  }, [])

  if (error) {
    return (
      <SellerShell>
        <div className="notice notice-error">{error}</div>
      </SellerShell>
    )
  }

  if (!stats) {
    return (
      <SellerShell>
        <div className="route-loading"><span className="spinner" /></div>
      </SellerShell>
    )
  }

  const pendingOrders = orders.filter((o) =>
    o.items.some((i) => i.status === 'placed' || i.status === 'processing')
  )

  return (
    <SellerShell>
      <div className="kpi-row">
        <div className="kpi">
          <span className="kpi-label">Total revenue</span>
          <strong className="kpi-value">{inr(stats.revenue)}</strong>
          <span className="kpi-sub">{inr(stats.revenue30d)} in the last 30 days</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Units sold</span>
          <strong className="kpi-value">{stats.units}</strong>
          <span className="kpi-sub">across {stats.orderCount} orders</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Awaiting fulfilment</span>
          <strong className="kpi-value">{stats.pending}</strong>
          <span className="kpi-sub">
            {stats.pending > 0 ? <Link to="/seller/orders" className="link-arrow">Pack them now</Link> : 'All caught up'}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Live products</span>
          <strong className="kpi-value">{stats.liveProducts}</strong>
          <span className="kpi-sub">
            {stats.draftProducts > 0 ? `${stats.draftProducts} in draft` : 'No drafts'}
          </span>
        </div>
      </div>

      <div className="seller-grid">
        <section className="panel">
          <div className="spread">
            <h3>Revenue, last 8 weeks</h3>
            <span className="small muted">Peak {inr(Math.max(...stats.weekly.map((w) => w.total)))}</span>
          </div>
          <RevenueChart weekly={stats.weekly} />
        </section>

        <section className="panel">
          <h3>Best performers</h3>
          {stats.topProducts.length === 0 ? (
            <p className="muted small" style={{ marginTop: '0.8rem' }}>No sales yet.</p>
          ) : (
            <ul className="top-list">
              {stats.topProducts.map((p) => (
                <li key={p.name}>
                  <img src={p.image} alt="" />
                  <div className="grow">
                    <strong>{p.name}</strong>
                    <span className="small muted">
                      {p.units} {p.units === 1 ? 'unit' : 'units'}
                    </span>
                  </div>
                  <strong className="small">{inr(p.revenue)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="seller-grid">
        <section className="panel">
          <div className="spread">
            <h3>Orders to fulfil</h3>
            <Link to="/seller/orders" className="link-arrow">All orders</Link>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="empty" style={{ padding: 'var(--gap-lg) 0' }}>
              <span className="empty-icon"><IconBox size={22} /></span>
              <h3>Nothing to pack</h3>
              <p className="small">Every order has been shipped or delivered.</p>
            </div>
          ) : (
            <ul className="mini-orders">
              {pendingOrders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <div className="grow">
                    <strong>{o.code}</strong>
                    <p className="small muted">
                      {o.buyerName} · {o.address.city} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="row">
                    {o.items.slice(0, 1).map((i) => (
                      <span key={i.variantId} className={`badge ${STATUS_TONE[i.status]}`}>
                        {STATUS_LABEL[i.status]}
                      </span>
                    ))}
                    <strong className="small">{inr(o.subtotal)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="spread">
            <h3>Low stock</h3>
            <Link to="/seller/products" className="link-arrow">Manage</Link>
          </div>

          {stats.lowStock.length === 0 ? (
            <p className="muted small" style={{ marginTop: '0.8rem' }}>
              Nothing is running low. Every live product has more than ten units.
            </p>
          ) : (
            <ul className="stock-list">
              {stats.lowStock.map((p) => (
                <li key={p.slug}>
                  <Link to={`/product/${p.slug}`} className="grow">{p.name}</Link>
                  <span className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-gold'}`}>
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link to="/seller/products/new" className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 'var(--gap)' }}>
            <IconPlus size={14} /> Add a product
          </Link>
        </section>
      </div>
    </SellerShell>
  )
}
