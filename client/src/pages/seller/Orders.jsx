import { useEffect, useState } from 'react'
import { api, inr, formatDate, relativeDate } from '../../api.js'
import { useToast } from '../../context/ToastContext.jsx'
import { SellerShell } from './SellerNav.jsx'
import { EmptyState } from '../../components/Bits.jsx'
import { ORDER_STATUSES, STATUS_LABEL, STATUS_TONE } from '../../constants.js'
import { IconBox, IconTruck } from '../../components/Icons.jsx'

/** The next sensible action for a line, or null when it's finished. */
const NEXT_STATUS = {
  placed: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
}

const NEXT_LABEL = {
  placed: 'Start packing',
  processing: 'Mark shipped',
  shipped: 'Mark delivered',
}

export default function SellerOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('open')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    api.sellerOrders().then((d) => setOrders(d.orders)).catch(() => setOrders([]))
  }, [])

  const advance = async (order, item, status) => {
    const key = `${order.code}-${item.variantId}`
    setBusy(key)
    try {
      await api.updateLineStatus(order.code, item.variantId, status)
      setOrders((os) =>
        os.map((o) =>
          o.code === order.code
            ? { ...o, items: o.items.map((i) => (i.variantId === item.variantId ? { ...i, status } : i)) }
            : o
        )
      )
      toast.success(`${item.name} · ${STATUS_LABEL[status]}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const isOpen = (o) => o.items.some((i) => i.status === 'placed' || i.status === 'processing')

  const visible = (orders ?? []).filter((o) => {
    if (filter === 'all') return true
    if (filter === 'open') return isOpen(o)
    return o.items.some((i) => i.status === filter)
  })

  const counts = {
    open: (orders ?? []).filter(isOpen).length,
    shipped: (orders ?? []).filter((o) => o.items.some((i) => i.status === 'shipped')).length,
    delivered: (orders ?? []).filter((o) => o.items.some((i) => i.status === 'delivered')).length,
    all: orders?.length ?? 0,
  }

  return (
    <SellerShell title="Orders" subtitle="Only your lines are shown — other sellers' items stay private.">
      <div className="row wrap" style={{ marginBottom: 'var(--gap-md)' }}>
        {['open', 'shipped', 'delivered', 'all'].map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'open' ? 'To fulfil' : f[0].toUpperCase() + f.slice(1)} <span className="muted">{counts[f]}</span>
          </button>
        ))}
      </div>

      {orders === null ? (
        <div className="route-loading"><span className="spinner" /></div>
      ) : visible.length === 0 ? (
        <EmptyState icon={<IconBox size={24} />} title={filter === 'open' ? 'Nothing to pack' : 'No orders here'}>
          {filter === 'open'
            ? 'Every order has been shipped or delivered. Nicely done.'
            : 'Try a different filter to see other orders.'}
        </EmptyState>
      ) : (
        <div className="stack" style={{ gap: 'var(--gap-md)' }}>
          {visible.map((order) => (
            <article key={order.id} className="panel seller-order">
              <header className="seller-order-head">
                <div>
                  <h3>{order.code}</h3>
                  <p className="small muted">
                    {order.buyerName} · {formatDate(order.createdAt)} · {relativeDate(order.createdAt)}
                  </p>
                </div>
                <div className="seller-order-total">
                  <strong>{inr(order.subtotal)}</strong>
                  <span className="small muted">
                    {order.units} {order.units === 1 ? 'unit' : 'units'}
                  </span>
                </div>
              </header>

              <ul className="seller-order-items">
                {order.items.map((item) => {
                  const key = `${order.code}-${item.variantId}`
                  const next = NEXT_STATUS[item.status]
                  return (
                    <li key={item.variantId}>
                      <img src={item.image} alt="" />
                      <div className="grow">
                        <strong>{item.name}</strong>
                        <p className="small muted">
                          {item.brand} · {item.variantLabel} · Qty {item.qty}
                        </p>
                        <span className={`badge ${STATUS_TONE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                      </div>

                      <div className="seller-order-actions">
                        <strong className="small">{inr(item.price * item.qty)}</strong>
                        <div className="row">
                          {next && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => advance(order, item, next)}
                              disabled={busy === key}
                            >
                              {busy === key ? <span className="spinner" /> : NEXT_LABEL[item.status]}
                            </button>
                          )}
                          <select
                            className="select select-sm"
                            value={item.status}
                            onChange={(e) => advance(order, item, e.target.value)}
                            disabled={busy === key}
                            aria-label={`Status for ${item.name}`}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <footer className="seller-order-foot small">
                <IconTruck size={15} />
                <span>
                  Ship to <strong>{order.address.fullName}</strong>, {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ''}, {order.address.city},{' '}
                  {order.address.state} {order.address.pincode} · {order.address.phone}
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </SellerShell>
  )
}
