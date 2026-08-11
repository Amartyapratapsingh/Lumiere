import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, inr } from '../api.js'
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard.jsx'
import { EmptyState } from '../components/Bits.jsx'
import { SORT_OPTIONS } from '../constants.js'
import { IconClose, IconSearch, IconChevron } from '../components/Icons.jsx'

const CATEGORY_COPY = {
  fragrance: {
    title: 'Fragrance',
    blurb:
      'Oud, attar and eau de parfum bought from the domestic counters of Deira and Sharjah — not the reformulated export batches.',
    image: '/images/categories/fragrance.jpg',
  },
  skincare: {
    title: 'Skincare',
    blurb:
      'Korean barrier care and French botanicals, checked for shelf life on arrival and stored out of the heat.',
    image: '/images/categories/skincare.jpg',
  },
  makeup: {
    title: 'Makeup',
    blurb: 'Milanese colour houses mixing pigment for warm and olive undertones that most ranges ignore.',
    image: '/images/categories/makeup.jpg',
  },
  'bath-body': {
    title: 'Bath & Body',
    blurb: 'Argan, beldi black soap and Dead Sea minerals — hammam rituals, sourced at origin.',
    image: '/images/categories/bath-body.jpg',
  },
  gifting: {
    title: 'Gifting',
    blurb: 'Sets, minis and discovery boxes that arrive wrapped and ready to hand over.',
    image: '/images/categories/gifting.jpg',
  },
}

const PRICE_BANDS = [
  { label: 'Under ₹2,000', min: '', max: 2000 },
  { label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { label: '₹5,000 – ₹9,000', min: 5000, max: 9000 },
  { label: 'Over ₹9,000', min: 9000, max: '' },
]

function FilterGroup({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="filter-group">
      <button type="button" className="filter-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {title} <IconChevron size={15} dir={open ? 'up' : 'down'} />
      </button>
      {open && <div className="filter-body">{children}</div>}
    </div>
  )
}

export default function Shop() {
  const { category } = useParams()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileFilters, setMobileFilters] = useState(false)

  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'featured'
  const concern = params.get('concern') ?? ''
  const brand = params.get('brand') ?? ''
  const seller = params.get('seller') ?? ''
  const minPrice = params.get('minPrice') ?? ''
  const maxPrice = params.get('maxPrice') ?? ''

  const copy = CATEGORY_COPY[category]

  useEffect(() => {
    api.meta().then(setMeta).catch(() => {})
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api
      .products({ category: category ?? 'all', q, sort, concern, brand, seller, minPrice, maxPrice }, controller.signal)
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ products: [], total: 0 })
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [category, q, sort, concern, brand, seller, minPrice, maxPrice])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const activeFilters = useMemo(() => {
    const list = []
    if (q) list.push({ key: 'q', label: `“${q}”` })
    if (concern) list.push({ key: 'concern', label: concern })
    if (brand) list.push({ key: 'brand', label: brand })
    if (seller) list.push({ key: 'seller', label: seller.replace(/-/g, ' ') })
    if (minPrice || maxPrice) {
      const band = PRICE_BANDS.find(
        (b) => String(b.min) === String(minPrice) && String(b.max) === String(maxPrice)
      )
      list.push({ key: 'price', label: band?.label ?? `${inr(minPrice || 0)}+` })
    }
    return list
  }, [q, concern, brand, seller, minPrice, maxPrice])

  const clearFilter = (key) =>
    key === 'price' ? update({ minPrice: '', maxPrice: '' }) : update({ [key]: '' })

  const clearAll = () => setParams(category ? {} : {}, { replace: true })

  const products = data?.products ?? []

  const sidebar = (
    <>
      <FilterGroup title="Category">
        <ul className="filter-list">
          <li>
            <Link to="/shop" className={!category ? 'is-on' : ''}>
              All products
            </Link>
          </li>
          {(meta?.categories ?? []).map((c) => (
            <li key={c.slug}>
              <Link to={`/shop/${c.slug}`} className={category === c.slug ? 'is-on' : ''}>
                {c.name} <span className="muted small">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="filter-chips">
          {PRICE_BANDS.map((b) => {
            const on = String(b.min) === String(minPrice) && String(b.max) === String(maxPrice)
            return (
              <button
                key={b.label}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() =>
                  on ? update({ minPrice: '', maxPrice: '' }) : update({ minPrice: b.min, maxPrice: b.max })
                }
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Concern & occasion">
        <div className="filter-chips">
          {(meta?.concerns ?? []).slice(0, 12).map((c) => (
            <button
              key={c.value}
              type="button"
              className="chip"
              aria-pressed={concern === c.value}
              onClick={() => update({ concern: concern === c.value ? '' : c.value })}
            >
              {c.value} <span className="muted">{c.count}</span>
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Brand" defaultOpen={false}>
        <ul className="filter-list">
          {(meta?.brands ?? []).map((b) => (
            <li key={b.value}>
              <button
                type="button"
                className={brand === b.value ? 'is-on' : ''}
                onClick={() => update({ brand: brand === b.value ? '' : b.value })}
              >
                {b.value} <span className="muted small">{b.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Imported from" defaultOpen={false}>
        <ul className="filter-list filter-list-plain">
          {(meta?.origins ?? []).map((o) => (
            <li key={o.value}>
              {o.value} <span className="muted small">{o.count}</span>
            </li>
          ))}
        </ul>
      </FilterGroup>
    </>
  )

  return (
    <>
      {copy ? (
        <header className="shop-hero">
          <img src={copy.image} alt="" />
          <div className="shop-hero-veil" />
          <div className="page shop-hero-body">
            <nav className="breadcrumbs breadcrumbs-light">
              <Link to="/">Home</Link> <span>/</span> <span aria-current="page">{copy.title}</span>
            </nav>
            <h1>{copy.title}</h1>
            <p className="lede">{copy.blurb}</p>
          </div>
        </header>
      ) : (
        <header className="page shop-head">
          <nav className="breadcrumbs">
            <Link to="/">Home</Link> <span>/</span> <span aria-current="page">Shop</span>
          </nav>
          <h1>{q ? `Results for “${q}”` : 'Everything on the shelf'}</h1>
          <p className="lede">
            {q
              ? 'Matching products across every category.'
              : 'Fragrance, skincare, colour and body — from six sourcing cities.'}
          </p>
        </header>
      )}

      <div className="page shop-layout">
        <aside className="shop-side" aria-label="Filters">
          <div className="shop-side-inner">{sidebar}</div>
        </aside>

        <div className="shop-main">
          <div className="shop-bar">
            <p className="small muted">
              {loading ? 'Loading…' : `${data?.total ?? 0} ${data?.total === 1 ? 'product' : 'products'}`}
            </p>

            <div className="row">
              <button
                type="button"
                className="btn btn-ghost btn-sm shop-filter-btn"
                onClick={() => setMobileFilters(true)}
              >
                Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
              </button>
              <label className="shop-sort">
                <span className="visually-hidden">Sort by</span>
                <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value })}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="active-filters">
              {activeFilters.map((f) => (
                <button key={f.key} type="button" className="chip is-active" onClick={() => clearFilter(f.key)}>
                  {f.label} <IconClose size={13} />
                </button>
              ))}
              <button type="button" className="link-arrow" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="pgrid">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={<IconSearch size={24} />}
              title="Nothing matched that"
              action={
                <button type="button" className="btn" onClick={clearAll}>
                  Clear filters
                </button>
              }
            >
              Try a broader price band, or drop one of the filters above.
            </EmptyState>
          ) : (
            <div className="pgrid">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
          )}
        </div>
      </div>

      {mobileFilters && (
        <div className="drawer-root">
          <div className="drawer-scrim" onClick={() => setMobileFilters(false)} />
          <aside className="drawer drawer-left" role="dialog" aria-modal="true" aria-label="Filters">
            <header className="drawer-head spread">
              <h3>Filters</h3>
              <button type="button" className="icon-btn" onClick={() => setMobileFilters(false)} aria-label="Close">
                <IconClose size={18} />
              </button>
            </header>
            <div className="drawer-scroll">{sidebar}</div>
            <footer className="drawer-foot">
              <button type="button" className="btn btn-block" onClick={() => setMobileFilters(false)}>
                Show {data?.total ?? 0} products
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  )
}
