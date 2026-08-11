import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { FREE_SHIPPING_OVER, SHIPPING_FLAT, DUTY_RATE } from '../constants.js'

const CartContext = createContext(null)
const KEY = 'lumiere.cart.v1'
const WISH_KEY = 'lumiere.wishlist.v1'

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/** One cart line per (product, variant) pair. */
const lineKey = (productId, variantId) => `${productId}::${variantId}`

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => read(KEY, []))
  const [wishlist, setWishlist] = useState(() => read(WISH_KEY, []))
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  const value = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const count = items.reduce((sum, i) => sum + i.qty, 0)
    const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT
    const importDuty = Math.round(subtotal * DUTY_RATE)

    return {
      items,
      count,
      subtotal,
      shipping,
      importDuty,
      total: subtotal + shipping + importDuty,
      freeShippingGap: Math.max(FREE_SHIPPING_OVER - subtotal, 0),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),

      add(product, variant, qty = 1) {
        const key = lineKey(product.id, variant.id)
        setItems((prev) => {
          const existing = prev.find((i) => lineKey(i.productId, i.variantId) === key)
          if (existing) {
            return prev.map((i) =>
              lineKey(i.productId, i.variantId) === key
                ? { ...i, qty: Math.min(i.qty + qty, Math.max(variant.stock, 1), 10) }
                : i
            )
          }
          return [
            ...prev,
            {
              productId: product.id,
              variantId: variant.id,
              slug: product.slug,
              name: product.name,
              brand: product.brand,
              image: product.images[0],
              variantLabel: variant.label,
              price: variant.price,
              mrp: variant.mrp ?? variant.price,
              stock: variant.stock,
              qty: Math.min(qty, Math.max(variant.stock, 1), 10),
            },
          ]
        })
        setDrawerOpen(true)
      },

      setQty(productId, variantId, qty) {
        const key = lineKey(productId, variantId)
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => lineKey(i.productId, i.variantId) !== key)
            : prev.map((i) =>
                lineKey(i.productId, i.variantId) === key
                  ? { ...i, qty: Math.min(qty, Math.max(i.stock ?? 10, 1), 10) }
                  : i
              )
        )
      },

      remove(productId, variantId) {
        const key = lineKey(productId, variantId)
        setItems((prev) => prev.filter((i) => lineKey(i.productId, i.variantId) !== key))
      },

      clear: () => setItems([]),

      // Wishlist is a plain list of product slugs.
      wishlist,
      isWished: (slug) => wishlist.includes(slug),
      toggleWish: (slug) =>
        setWishlist((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
    }
  }, [items, wishlist, drawerOpen])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
