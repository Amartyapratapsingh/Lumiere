import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { IconArrow, IconStore } from '../components/Icons.jsx'

export default function Brands() {
  const [meta, setMeta] = useState(null)
  const [products, setProducts] = useState([])

  useEffect(() => {
    api.meta().then(setMeta).catch(() => {})
    api.products({ limit: 96 }).then((d) => setProducts(d.products)).catch(() => {})
  }, [])

  // Group live products by the store that imports them.
  const stores = new Map()
  for (const p of products) {
    if (!p.seller) continue
    const entry = stores.get(p.seller.storeSlug) ?? { ...p.seller, products: [] }
    entry.products.push(p)
    stores.set(p.seller.storeSlug, entry)
  }

  const brandsByOrigin = new Map()
  for (const p of products) {
    const country = p.origin.split('·').pop().trim()
    const set = brandsByOrigin.get(country) ?? new Set()
    set.add(p.brand)
    brandsByOrigin.set(country, set)
  }

  return (
    <div className="page section-tight">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link> <span>/</span> <span aria-current="page">Brands &amp; importers</span>
      </nav>
      <h1>Brands &amp; importers</h1>
      <p className="lede" style={{ marginBottom: 'var(--gap-lg)' }}>
        Every product on Lumière is carried by one of these verified importers. Click through to see
        everything a store stocks.
      </p>

      <div className="store-grid">
        {[...stores.values()].map((store) => (
          <article key={store.storeSlug} className="store-card panel">
            <header className="row" style={{ alignItems: 'flex-start' }}>
              <span className="pdp-seller-avatar"><IconStore size={18} /></span>
              <div className="grow">
                <h3>{store.storeName}</h3>
                <p className="small muted">
                  {store.city} · Since {store.since}
                </p>
              </div>
            </header>

            <p className="muted small">{store.storeBio}</p>

            <div className="store-thumbs">
              {store.products.slice(0, 5).map((p) => (
                <Link key={p.id} to={`/product/${p.slug}`} title={p.name}>
                  <img src={p.images[0]} alt={p.name} loading="lazy" />
                </Link>
              ))}
            </div>

            <footer className="spread">
              <span className="small muted">{store.products.length} products</span>
              <Link to={`/shop?seller=${store.storeSlug}`} className="link-arrow">
                Visit store <IconArrow size={14} />
              </Link>
            </footer>
          </article>
        ))}
      </div>

      <section style={{ marginTop: 'var(--gap-xl)' }}>
        <div className="section-head">
          <div>
            <h2>Brands by origin</h2>
            <p>{meta?.stats?.brands ?? '—'} labels across {brandsByOrigin.size} sourcing regions.</p>
          </div>
        </div>

        <div className="origin-grid">
          {[...brandsByOrigin.entries()].map(([country, brands]) => (
            <div key={country} className="origin-card">
              <h4>{country}</h4>
              <ul>
                {[...brands].map((b) => (
                  <li key={b}>
                    <Link to={`/shop?brand=${encodeURIComponent(b)}`}>{b}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
