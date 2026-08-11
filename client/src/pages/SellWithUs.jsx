import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { IconArrow, IconBox, IconChart, IconStore, IconCheck } from '../components/Icons.jsx'

const STEPS = [
  {
    n: '01',
    title: 'Open your store',
    body: 'Pick a seller account at sign-up, give your store a name and tell shoppers where you source from. Takes about two minutes.',
  },
  {
    n: '02',
    title: 'List what you carry',
    body: 'Add products with sizes or shades, set your own price against MRP, and mark stock per variant. Drafts stay hidden until you publish.',
  },
  {
    n: '03',
    title: 'Fulfil and get paid',
    body: 'Orders land in your dashboard. Move each line from packing to shipped to delivered, and track revenue as it comes in.',
  },
]

const TERMS = [
  'No listing fee, no monthly charge',
  'You set prices and stock levels',
  'Your store page links from every product you sell',
  'Archive a product any time — order history stays intact',
]

export default function SellWithUs() {
  const { user } = useAuth()

  return (
    <>
      <header className="page section-tight sell-hero">
        <span className="eyebrow">Sell on Lumière</span>
        <h1>You know which batch is worth carrying. We handle the rest.</h1>
        <p className="lede">
          Lumière is a marketplace, not a middleman. Bring the stock you already import and get a
          storefront, a payment flow and Indian shoppers who are actively looking for it.
        </p>
        <div className="row wrap" style={{ marginTop: 'var(--gap-md)' }}>
          {user?.role === 'seller' ? (
            <Link to="/seller" className="btn btn-lg">
              Go to your dashboard <IconArrow size={16} />
            </Link>
          ) : (
            <Link to="/signup?role=seller" className="btn btn-lg">
              Open a seller account <IconArrow size={16} />
            </Link>
          )}
          <Link to="/brands" className="btn btn-ghost btn-lg">See who already sells here</Link>
        </div>
      </header>

      <section className="section-tight">
        <div className="page">
          <div className="steps">
            {STEPS.map((s) => (
              <article key={s.n} className="step">
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="page">
          <div className="sell-split">
            <div className="sell-preview">
              <div className="sell-preview-card">
                <div className="row">
                  <span className="pdp-seller-avatar"><IconChart size={18} /></span>
                  <div>
                    <p className="small muted">Revenue, last 30 days</p>
                    <strong className="serif" style={{ fontSize: 'var(--step-2)' }}>₹1,86,400</strong>
                  </div>
                </div>
                <div className="sell-bars">
                  {[38, 52, 44, 71, 63, 88, 74, 96].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="sell-preview-card sell-preview-orders">
                <div className="spread">
                  <strong>Orders to fulfil</strong>
                  <span className="badge badge-gold">3 pending</span>
                </div>
                <div className="sell-row"><IconBox size={15} /> LM-25187 · Mystique Noir · ×1</div>
                <div className="sell-row"><IconBox size={15} /> LM-25203 · Hyaluronic Serum · ×2</div>
                <div className="sell-row"><IconBox size={15} /> LM-25204 · Rose Attar · ×1</div>
              </div>
            </div>

            <div>
              <span className="eyebrow">What you get</span>
              <h2>A real dashboard, not a spreadsheet.</h2>
              <p className="lede">
                Revenue by week, units sold, low-stock warnings and every incoming order broken down to the
                line item — so you know what to pack before you open the warehouse.
              </p>
              <ul className="tick-list">
                {TERMS.map((t) => (
                  <li key={t}>
                    <IconCheck size={15} /> {t}
                  </li>
                ))}
              </ul>
              <Link to={user?.role === 'seller' ? '/seller' : '/signup?role=seller'} className="btn">
                <IconStore size={16} /> {user?.role === 'seller' ? 'Open dashboard' : 'Start selling'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
