import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr } from '../api.js'
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard.jsx'
import { Stars } from '../components/Stars.jsx'
import {
  IconArrow, IconArrowUpRight, IconGlobe, IconShield, IconSparkle, IconTruck, IconStore, IconFlask,
} from '../components/Icons.jsx'

const TABS = [
  { key: 'fragrance', label: 'Fragrance' },
  { key: 'skincare', label: 'Skincare' },
  { key: 'makeup', label: 'Makeup' },
  { key: 'bath-body', label: 'Bath & Body' },
]

const RITUALS = [
  { label: 'Evening oud', to: '/shop?concern=Evening%20wear', img: '/images/products/mystique-noir.jpg' },
  { label: 'Barrier repair', to: '/shop?concern=Sensitive%20skin', img: '/images/products/barrier-repair-cream.jpg' },
  { label: 'The lip edit', to: '/shop/makeup', img: '/images/products/nude-edit-trio.jpg' },
  { label: 'Hammam ritual', to: '/shop/bath-body', img: '/images/products/hammam-body-polish.jpg' },
]

const VOICES = [
  {
    quote:
      'I used to ask cousins flying back from Sharjah to carry attar for me. This is the first time I have bought oud online and got exactly what I expected.',
    name: 'Zoya R.',
    city: 'Hyderabad',
    rating: 5,
  },
  {
    quote:
      'The expiry dates are printed on the listing, which no other importer does. That is the whole reason I keep coming back for my Korean creams.',
    name: 'Ananya D.',
    city: 'Bengaluru',
    rating: 5,
  },
  {
    quote:
      'Customs was already paid. Nothing extra to settle at the door, which had burnt me twice before on other sites.',
    name: 'Imran K.',
    city: 'Lucknow',
    rating: 4,
  },
]

export default function Home() {
  const [meta, setMeta] = useState(null)
  const [tab, setTab] = useState('fragrance')
  const [tabProducts, setTabProducts] = useState(null)
  const [bestsellers, setBestsellers] = useState(null)
  const [newIn, setNewIn] = useState(null)

  useEffect(() => {
    api.meta().then(setMeta).catch(() => {})
    api.products({ sort: 'featured', limit: 8 }).then((d) => setBestsellers(d.products)).catch(() => {})
    api.products({ sort: 'newest', limit: 4 }).then((d) => setNewIn(d.products)).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    setTabProducts(null)
    api
      .products({ category: tab, sort: 'featured', limit: 3 })
      .then((d) => alive && setTabProducts(d.products))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [tab])

  const stats = meta?.stats

  return (
    <>
      {/* ─────────── hero ─────────── */}
      <section className="hero">
        <div className="page hero-inner">
          <div className="hero-frame">
            <img className="hero-img" src="/images/editorial/hero-portrait.jpg" alt="" />
            <div className="hero-veil" />

            <div className="hero-copy">
              <span className="hero-eyebrow">
                <IconGlobe size={14} /> Dubai · Sharjah · Seoul · Milan · Grasse
              </span>
              <h1 className="hero-word">
                Lumière<span className="hero-reg">®</span>
              </h1>
              <p className="hero-sub">Imported beauty, cleared and delivered across India.</p>
              <div className="hero-cta">
                <Link to="/shop" className="btn btn-light btn-lg">
                  Shop the shelf <IconArrow size={16} />
                </Link>
                <Link to="/shop/fragrance" className="btn btn-ghost btn-lg hero-cta-ghost">
                  Oud &amp; attar
                </Link>
              </div>
            </div>

            {/* Stat badge, echoing the "70+ trusted brands" chip in the reference. */}
            <div className="hero-stat">
              <strong>{stats ? `${stats.brands}+` : '—'}</strong>
              <span>Imported brands</span>
            </div>

            {/* Floating product card, bottom-right, as in the marketplace reference. */}
            {bestsellers?.[0] && (
              <Link to={`/product/${bestsellers[0].slug}`} className="hero-float">
                <img src={bestsellers[0].images[0]} alt="" />
                <div className="hero-float-body">
                  <span className="badge badge-gold">Most loved</span>
                  <strong>{bestsellers[0].name}</strong>
                  <span className="small muted">{bestsellers[0].origin}</span>
                  <span className="hero-float-price">{inr(bestsellers[0].price)}</span>
                </div>
              </Link>
            )}
          </div>

          <ul className="hero-marks">
            <li><IconShield size={17} /> Sealed, batch-checked stock</li>
            <li><IconTruck size={17} /> Duty paid before dispatch</li>
            <li><IconFlask size={17} /> 12+ months shelf life, guaranteed</li>
            <li><IconStore size={17} /> {stats ? stats.sellers : '—'} verified importers</li>
          </ul>
        </div>
      </section>

      {/* ─────────── categories ─────────── */}
      <section className="section-tight">
        <div className="page">
          <div className="section-head">
            <div>
              <h2>Shop by shelf</h2>
              <p>Find your category in seconds.</p>
            </div>
            <Link to="/shop" className="link-arrow">
              All categories <IconArrow size={15} />
            </Link>
          </div>

          <div className="cat-grid">
            {(meta?.categories ?? Array.from({ length: 5 })).map((c, i) =>
              c ? (
                <Link key={c.slug} to={`/shop/${c.slug}`} className={`cat-tile cat-${c.slug}`}>
                  <img src={c.image} alt="" loading="lazy" />
                  <span className="cat-arrow"><IconArrowUpRight size={15} /></span>
                  <div className="cat-body">
                    <h3>{c.name}</h3>
                    <p className="small">{c.tagline}</p>
                    <span className="cat-count">{c.count} products</span>
                  </div>
                </Link>
              ) : (
                <div key={i} className="cat-tile skeleton" />
              )
            )}
          </div>
        </div>
      </section>

      {/* ─────────── hot picks, with tabs ─────────── */}
      <section className="section-tight">
        <div className="page">
          <div className="section-head">
            <div>
              <h2>Hot picks for you</h2>
              <p>Loved by thousands of shoppers across India.</p>
            </div>
            <div className="tabs" role="tablist" aria-label="Product categories">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  className={`tab ${tab === t.key ? 'is-active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="picks">
            {tabProducts
              ? tabProducts.map((p) => <ProductCard key={p.id} product={p} priority />)
              : Array.from({ length: 3 }, (_, i) => <ProductCardSkeleton key={i} />)}

            <Link to="/shop/gifting" className="picks-promo">
              <img src="/images/editorial/glow-ritual.jpg" alt="" loading="lazy" />
              <div className="picks-promo-body">
                <span className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>Gifting</span>
                <h3>Boxed, wrapped, ready to give</h3>
                <Stars value={5} size={13} />
                <span className="btn btn-light btn-sm">View collection</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── the import story ─────────── */}
      <section className="section">
        <div className="page">
          <div className="story">
            <div className="story-media">
              <img src="/images/editorial/dubai-counter.jpg" alt="Perfume bottles on a dark counter" loading="lazy" />
              <div className="story-chip">
                <IconSparkle size={16} />
                <div>
                  <strong>Souk-sourced</strong>
                  <span className="small">Sikkat Al Khail St, Deira</span>
                </div>
              </div>
            </div>

            <div className="story-body">
              <span className="eyebrow">The import story</span>
              <h2>The same juice they sell in Deira — not a watered-down export batch.</h2>
              <p className="lede">
                Gulf houses often bottle a separate, weaker formula for overseas distribution. Our sellers
                buy from the domestic counters instead and hand-carry stock through Mumbai customs, so what
                lands at your door is what you would have bought standing in the souk.
              </p>
              <ul className="story-points">
                <li>
                  <strong>Batch codes photographed</strong>
                  <span>Every carton is shot before it leaves the warehouse — ask and we will send it.</span>
                </li>
                <li>
                  <strong>Duty settled up front</strong>
                  <span>A flat 5% handling charge at checkout. Nothing more is collected at your door.</span>
                </li>
                <li>
                  <strong>Nothing near expiry</strong>
                  <span>We reject any consignment with under twelve months of shelf life left.</span>
                </li>
              </ul>
              <Link to="/about" className="btn btn-ghost">
                How we source <IconArrow size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── bestsellers rail ─────────── */}
      <section className="section-tight">
        <div className="page">
          <div className="section-head">
            <div>
              <h2>Best sellers this month</h2>
              <p>What is moving fastest off the shelf right now.</p>
            </div>
            <Link to="/shop?sort=featured" className="link-arrow">
              See all <IconArrow size={15} />
            </Link>
          </div>

          <div className="pgrid">
            {bestsellers
              ? bestsellers.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)
              : Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </section>

      {/* ─────────── rituals ─────────── */}
      <section className="section-tight">
        <div className="page">
          <div className="section-head">
            <div>
              <h2>Shop by ritual</h2>
              <p>Pick the moment, not the ingredient list.</p>
            </div>
          </div>
          <div className="ritual-row">
            {RITUALS.map((r) => (
              <Link key={r.label} to={r.to} className="ritual">
                <img src={r.img} alt="" loading="lazy" />
                <span>{r.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── new in + voices ─────────── */}
      <section className="section-tight">
        <div className="page voices-wrap">
          <div>
            <div className="section-head">
              <div>
                <h2>Just landed</h2>
                <p>Fresh off this month's consignment.</p>
              </div>
              <Link to="/shop?sort=newest" className="link-arrow">
                New in <IconArrow size={15} />
              </Link>
            </div>
            <div className="pgrid">
              {newIn
                ? newIn.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)
                : Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          </div>

          <aside className="voices">
            <span className="eyebrow">From our shoppers</span>
            {VOICES.map((v) => (
              <blockquote key={v.name} className="voice">
                <Stars value={v.rating} size={14} />
                <p>“{v.quote}”</p>
                <footer className="small muted">
                  {v.name} · {v.city}
                </footer>
              </blockquote>
            ))}
          </aside>
        </div>
      </section>

      {/* ─────────── seller band ─────────── */}
      <section className="section-tight">
        <div className="page">
          <div className="seller-band">
            <div>
              <span className="eyebrow" style={{ color: 'rgba(255,255,255,.65)' }}>For importers</span>
              <h2>Have stock sitting in a Dubai warehouse?</h2>
              <p>
                Open a seller account, list what you carry, and reach shoppers across India. You keep
                control of pricing and stock; we handle the storefront, payments and the customer.
              </p>
              <div className="row wrap" style={{ marginTop: '1.5rem' }}>
                <Link to="/signup?role=seller" className="btn btn-light">
                  Open a store <IconArrow size={15} />
                </Link>
                <Link to="/sell" className="btn btn-ghost seller-band-ghost">
                  How selling works
                </Link>
              </div>
            </div>
            <div className="seller-band-stats">
              <div>
                <strong>{stats?.products ?? '—'}</strong>
                <span>Products listed</span>
              </div>
              <div>
                <strong>{stats?.sellers ?? '—'}</strong>
                <span>Active importers</span>
              </div>
              <div>
                <strong>0%</strong>
                <span>Listing fee</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
