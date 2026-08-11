import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, inr, formatDate } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { ProductCard } from '../components/ProductCard.jsx'
import { Stars, StarPicker } from '../components/Stars.jsx'
import { Accordion, QtyStepper, TrustRow } from '../components/Bits.jsx'
import {
  IconChevron, IconHeart, IconShield, IconLeaf, IconRabbit, IconFlask, IconTruck, IconStore, IconCheck,
} from '../components/Icons.jsx'

const TRUST = [
  { icon: <IconShield size={22} />, label: 'Authenticity\nguaranteed' },
  { icon: <IconFlask size={22} />, label: 'Batch code\nverified' },
  { icon: <IconLeaf size={22} />, label: '12+ months\nshelf life' },
  { icon: <IconRabbit size={22} />, label: 'Cruelty-free\nsourcing' },
]

/** Delivery estimate — five working days from now, in plain language. */
function deliveryWindow() {
  const d = new Date(Date.now() + 5 * 86_400_000)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ReviewForm({ slug, onAdded }) {
  const { user } = useAuth()
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div className="notice notice-info">
        <span>
          <Link to="/login" className="link-arrow">Sign in</Link> to leave a review.
        </span>
      </div>
    )
  }
  if (user.role !== 'consumer') {
    return <div className="notice notice-info">Reviews can only be left from a shopper account.</div>
  }

  const RATING_WORD = ['', 'Poor', 'Not great', 'Decent', 'Very good', 'Excellent']

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!rating) return setError('Tap a star to rate this product.')
    setBusy(true)
    try {
      const { review } = await api.addReview(slug, { rating, title, body })
      onAdded(review)
      setRating(0)
      setTitle('')
      setBody('')
      toast.success(body.trim() ? 'Thanks — your review is live.' : 'Thanks for rating!')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="review-form panel" onSubmit={submit}>
      <h4>Rate this product</h4>
      <p className="small muted">
        Tap the stars to rate. Writing something is optional.
      </p>

      <div className="field">
        <span className="label">Your rating</span>
        <div className="rating-input">
          <StarPicker value={rating} onChange={setRating} />
          {rating > 0 && <span className="rating-word">{RATING_WORD[rating]}</span>}
        </div>
      </div>

      {/* The written part only unfolds once they've picked a rating. */}
      {rating > 0 && (
        <>
          <div className="field">
            <label htmlFor="rv-title">
              Headline <span className="muted">(optional)</span>
            </label>
            <input
              id="rv-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sums up your experience"
              maxLength={80}
            />
          </div>
          <div className="field">
            <label htmlFor="rv-body">
              Your review <span className="muted">(optional)</span>
            </label>
            <textarea
              id="rv-body"
              className="textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How does it wear? Would you buy it again?"
            />
          </div>
        </>
      )}

      {error && <div className="notice notice-error">{error}</div>}

      <button className="btn" disabled={busy || !rating}>
        {busy ? <span className="spinner" /> : body.trim() ? 'Post review' : 'Submit rating'}
      </button>
    </form>
  )
}

export default function Product() {
  const { slug } = useParams()
  const cart = useCart()
  const toast = useToast()

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(0)
  const [variantId, setVariantId] = useState(null)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setData(null)
    setError('')
    setActive(0)
    setQty(1)
    api
      .product(slug)
      .then((d) => {
        setData(d)
        // Default to the first variant that is actually in stock.
        const first = d.product.variants.find((v) => v.stock > 0) ?? d.product.variants[0]
        setVariantId(first.id)
      })
      .catch((err) => setError(err.message))
  }, [slug])

  if (error) {
    return (
      <div className="page section">
        <div className="empty">
          <h3>We couldn’t find that product</h3>
          <p>It may have sold out and been delisted.</p>
          <Link to="/shop" className="btn">Back to the shop</Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page pdp-skeleton">
        <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--r-lg)' }} />
        <div className="stack">
          <div className="skeleton" style={{ height: 14, width: '30%' }} />
          <div className="skeleton" style={{ height: 44, width: '85%' }} />
          <div className="skeleton" style={{ height: 14, width: '45%' }} />
          <div className="skeleton" style={{ height: 90, width: '100%' }} />
          <div className="skeleton" style={{ height: 52, width: '100%', borderRadius: '999px' }} />
        </div>
      </div>
    )
  }

  const { product, reviews, related } = data
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const savings = (variant.mrp ?? variant.price) - variant.price
  const discount = savings > 0 ? Math.round((savings / variant.mrp) * 100) : 0
  const wished = cart.isWished(product.slug)
  const lowStock = variant.stock > 0 && variant.stock <= 8

  const addToCart = () => {
    setAdding(true)
    cart.add(product, variant, qty)
    toast.success(`${product.name} added to your bag`)
    setTimeout(() => setAdding(false), 400)
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <>
      <div className="page">
        <nav className="breadcrumbs">
          <Link to="/">Home</Link> <span>/</span>
          <Link to={`/shop/${product.category}`}>
            {product.category.replace('-', ' & ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Link>
          <span>/</span> <span aria-current="page">{product.name}</span>
        </nav>
      </div>

      <section className="page pdp">
        {/* ---- gallery: vertical thumbnail rail + main image (reference 2) ---- */}
        <div className="pdp-gallery">
          <div className="pdp-thumbs">
            <button
              type="button"
              className="pdp-thumb-nav"
              onClick={() => setActive((i) => Math.max(0, i - 1))}
              disabled={active === 0}
              aria-label="Previous image"
            >
              <IconChevron size={15} dir="up" />
            </button>

            {product.images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`pdp-thumb ${i === active ? 'is-active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === active}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}

            <button
              type="button"
              className="pdp-thumb-nav"
              onClick={() => setActive((i) => Math.min(product.images.length - 1, i + 1))}
              disabled={active === product.images.length - 1}
              aria-label="Next image"
            >
              <IconChevron size={15} dir="down" />
            </button>
          </div>

          <div className="pdp-main">
            {product.badges[0] && <span className="badge badge-light pdp-badge">{product.badges[0]}</span>}
            <img src={product.images[active]} alt={product.name} />
          </div>
        </div>

        {/* ---- buy panel ---- */}
        <div className="pdp-buy">
          <p className="pdp-brand">{product.brand}</p>
          <h1 className="pdp-title">{product.name}</h1>
          <p className="pdp-tagline">{product.tagline}</p>

          <div className="pdp-rating">
            <Stars value={product.rating} size={16} />
            <a href="#reviews" className="small muted">
              {product.reviewCount} reviews
            </a>
          </div>

          <div className="pdp-price">
            <strong>{inr(variant.price)}</strong>
            {savings > 0 && (
              <>
                <s className="muted">{inr(variant.mrp)}</s>
                <span className="badge badge-blush">{discount}% off</span>
              </>
            )}
          </div>

          <p className="pdp-desc">{product.description}</p>

          {/* size / shade chips */}
          <div className="pdp-variants">
            <span className="label">
              {product.category === 'makeup' ? 'Shade' : 'Size'}:
              <span className="muted"> {variant.label}</span>
            </span>
            <div className="row wrap">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="chip chip-variant"
                  aria-pressed={v.id === variant.id}
                  disabled={v.stock === 0}
                  onClick={() => {
                    setVariantId(v.id)
                    setQty(1)
                  }}
                  title={v.stock === 0 ? 'Out of stock' : `${inr(v.price)}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {lowStock && (
            <p className="pdp-low">
              Only {variant.stock} left at this price — this one restocks slowly.
            </p>
          )}

          <div className="pdp-actions">
            <QtyStepper value={qty} onChange={setQty} max={Math.min(variant.stock || 1, 10)} />
            <button
              type="button"
              className="btn btn-lg grow"
              onClick={addToCart}
              disabled={variant.stock === 0 || adding}
            >
              {variant.stock === 0 ? 'Sold out' : adding ? <IconCheck size={17} /> : 'Add to cart'}
            </button>
            <button
              type="button"
              className={`icon-btn ${wished ? 'is-active' : ''}`}
              onClick={() => cart.toggleWish(product.slug)}
              aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-pressed={wished}
            >
              <IconHeart size={19} filled={wished} />
            </button>
          </div>

          <p className="pdp-delivery small">
            <IconTruck size={15} /> Ships free over {inr(2500)} · Expected by <strong>{deliveryWindow()}</strong>
          </p>

          <TrustRow items={TRUST} />

          {/* seller card — the marketplace half of the brief */}
          {product.seller && (
            <div className="pdp-seller">
              <div className="pdp-seller-head">
                <span className="pdp-seller-avatar"><IconStore size={18} /></span>
                <div className="grow">
                  <p className="small muted">Sold and imported by</p>
                  <strong>{product.seller.storeName}</strong>
                </div>
                {product.seller.storeRating && (
                  <Stars value={product.seller.storeRating} size={13} showValue />
                )}
              </div>
              <p className="small muted">{product.seller.storeBio}</p>
              <div className="pdp-seller-foot small">
                <span>{product.seller.city}</span>
                <span>·</span>
                <span>Selling since {product.seller.since}</span>
                <Link to={`/shop?seller=${product.seller.storeSlug}`} className="link-arrow">
                  View store
                </Link>
              </div>
            </div>
          )}

          {/* accordions */}
          <div className="pdp-accordions">
            <Accordion title="Detail" defaultOpen>
              <p>{product.description}</p>
              {product.notes && (
                <p>
                  <strong>Top:</strong> {product.notes.top} · <strong>Heart:</strong> {product.notes.heart} ·{' '}
                  <strong>Base:</strong> {product.notes.base}
                </p>
              )}
              <p>
                <strong>Imported from:</strong> {product.origin}
              </p>
            </Accordion>

            <Accordion title="How to use">
              <p>{product.howToUse}</p>
            </Accordion>

            <Accordion title="Ingredients">
              <p>{product.ingredients}</p>
            </Accordion>

            <Accordion title="Shipping, duty & returns">
              <p>
                Dispatched within 24 hours of your order and delivered in 2–5 working days across India.
                Free over {inr(2500)}; a flat {inr(149)} below that.
              </p>
              <p>
                A 5% customs handling charge is added at checkout and paid by us before dispatch — the
                courier will never ask you for anything at the door.
              </p>
              <p>
                Unopened items can be returned within 14 days. For hygiene reasons we cannot accept opened
                cosmetics unless the item arrived damaged or is not what you ordered.
              </p>
            </Accordion>
          </div>
        </div>
      </section>

      {/* ---- reviews ---- */}
      <section className="section-tight" id="reviews">
        <div className="page pdp-reviews">
          <div className="pdp-reviews-summary">
            <h2>What shoppers say</h2>
            <div className="pdp-score">
              <strong>{product.rating.toFixed(1)}</strong>
              <div>
                <Stars value={product.rating} size={16} />
                <p className="small muted">Based on {product.reviewCount} reviews</p>
              </div>
            </div>

            <ul className="rating-bars">
              {ratingBreakdown.map((b) => {
                const pct = reviews.length ? (b.count / reviews.length) * 100 : 0
                return (
                  <li key={b.star}>
                    <span className="small">{b.star}★</span>
                    <div className="progress">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="small muted">{b.count}</span>
                  </li>
                )
              })}
            </ul>

            <ReviewForm
              slug={product.slug}
              onAdded={(review) =>
                setData((d) => ({
                  ...d,
                  reviews: [review, ...d.reviews],
                  product: { ...d.product, reviewCount: d.product.reviewCount + 1 },
                }))
              }
            />
          </div>

          <div className="pdp-review-list">
            {reviews.length === 0 ? (
              <p className="muted">No reviews yet — be the first to write one.</p>
            ) : (
              reviews.map((r) => (
                <article key={r.id} className="review">
                  <header className="spread">
                    <div>
                      <Stars value={r.rating} size={14} />
                      {r.title && <h4>{r.title}</h4>}
                    </div>
                    <span className="small muted">{formatDate(r.createdAt)}</span>
                  </header>
                  {r.body ? (
                    <p>{r.body}</p>
                  ) : (
                    <p className="review-rating-only">Rated {r.rating} out of 5 — no comment left.</p>
                  )}
                  <footer className="small muted">
                    {r.author}
                    {r.city && ` · ${r.city}`}
                    {r.verified && (
                      <span className="verified">
                        <IconCheck size={12} /> Verified purchase
                      </span>
                    )}
                  </footer>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ---- related ---- */}
      {related.length > 0 && (
        <section className="section-tight">
          <div className="page">
            <div className="section-head">
              <div>
                <h2>You may also like</h2>
                <p>More from the {product.category.replace('-', ' & ')} shelf.</p>
              </div>
              <Link to={`/shop/${product.category}`} className="link-arrow">
                See all
              </Link>
            </div>
            <div className="pgrid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
