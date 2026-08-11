import { Link } from 'react-router-dom'
import { inr } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { Stars } from './Stars.jsx'
import { IconArrowUpRight, IconHeart, IconBag } from './Icons.jsx'

/**
 * The marketplace card from reference 1 — rounded tile, floating price pill and
 * a quick-add button that appears on hover.
 */
export function ProductCard({ product, priority = false }) {
  const cart = useCart()
  const wished = cart.isWished(product.slug)
  const cheapest = product.variants.reduce((a, b) => (a.price <= b.price ? a : b))

  const quickAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    cart.add(product, cheapest, 1)
  }

  return (
    <article className={`pcard ${!product.inStock ? 'is-out' : ''}`}>
      <Link to={`/product/${product.slug}`} className="pcard-media">
        <img
          src={product.images[0]}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />

        <div className="pcard-badges">
          {product.badges.slice(0, 1).map((b) => (
            <span key={b} className="badge badge-light">{b}</span>
          ))}
          {product.discountPct >= 20 && (
            <span className="badge badge-blush">−{product.discountPct}%</span>
          )}
        </div>

        <button
          type="button"
          className={`pcard-wish icon-btn ${wished ? 'is-active' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            cart.toggleWish(product.slug)
          }}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          aria-pressed={wished}
        >
          <IconHeart size={17} filled={wished} />
        </button>

        {/* Floating price pill, lifted straight from the marketplace reference. */}
        <span className="pcard-price-pill">
          {product.hasMultipleSizes && <em>from</em>} {inr(product.price)}
        </span>

        {product.inStock ? (
          <button type="button" className="pcard-add" onClick={quickAdd}>
            <IconBag size={15} /> Quick add
          </button>
        ) : (
          <span className="pcard-sold">Sold out</span>
        )}
      </Link>

      <div className="pcard-body">
        <p className="pcard-brand">{product.brand}</p>
        <h3 className="pcard-name">
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="pcard-meta">
          <Stars value={product.rating} size={13} />
          <span className="pcard-count">({product.reviewCount})</span>
        </div>
        <p className="pcard-origin">
          <IconArrowUpRight size={13} /> {product.origin}
        </p>
      </div>
    </article>
  )
}

/** Placeholder shown while a grid is loading. */
export function ProductCardSkeleton() {
  return (
    <div className="pcard">
      <div className="pcard-media skeleton" style={{ aspectRatio: '4 / 5' }} />
      <div className="pcard-body stack" style={{ gap: '0.5rem' }}>
        <div className="skeleton" style={{ height: 10, width: '40%' }} />
        <div className="skeleton" style={{ height: 16, width: '80%' }} />
        <div className="skeleton" style={{ height: 10, width: '55%' }} />
      </div>
    </div>
  )
}
