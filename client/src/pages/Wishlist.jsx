import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard.jsx'
import { EmptyState } from '../components/Bits.jsx'
import { IconHeart } from '../components/Icons.jsx'

export default function Wishlist() {
  const cart = useCart()
  const [products, setProducts] = useState(null)

  useEffect(() => {
    if (cart.wishlist.length === 0) {
      setProducts([])
      return
    }
    // No bulk-by-slug endpoint — fetch the saved ones individually.
    Promise.all(cart.wishlist.map((slug) => api.product(slug).catch(() => null)))
      .then((results) => setProducts(results.filter(Boolean).map((r) => r.product)))
      .catch(() => setProducts([]))
  }, [cart.wishlist.join(',')])

  return (
    <div className="page section-tight">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link> <span>/</span> <span aria-current="page">Wishlist</span>
      </nav>
      <h1>Saved for later</h1>
      <p className="lede" style={{ marginBottom: 'var(--gap-lg)' }}>
        Your wishlist lives in this browser — no account needed.
      </p>

      {products === null ? (
        <div className="pgrid">
          {Array.from({ length: 4 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<IconHeart size={24} />}
          title="Nothing saved yet"
          action={<Link to="/shop" className="btn">Find something you love</Link>}
        >
          Tap the heart on any product to keep it here.
        </EmptyState>
      ) : (
        <div className="pgrid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
