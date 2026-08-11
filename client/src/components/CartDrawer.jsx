import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { inr } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { QtyStepper } from './Bits.jsx'
import { IconBag, IconClose, IconTrash, IconTruck } from './Icons.jsx'

/** Slide-over cart. Opens automatically after any add-to-cart. */
export function CartDrawer() {
  const cart = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    if (!cart.drawerOpen) return
    const onKey = (e) => e.key === 'Escape' && cart.closeDrawer()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [cart.drawerOpen])

  if (!cart.drawerOpen) return null

  const progress = Math.min(100, (cart.subtotal / (cart.subtotal + cart.freeShippingGap || 1)) * 100)

  return (
    <div className="drawer-root">
      <div className="drawer-scrim" onClick={cart.closeDrawer} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping bag">
        <header className="drawer-head spread">
          <h3>
            Your bag <span className="muted">({cart.count})</span>
          </h3>
          <button type="button" className="icon-btn" onClick={cart.closeDrawer} aria-label="Close bag">
            <IconClose size={18} />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="drawer-empty">
            <IconBag size={34} />
            <h4>Your bag is empty</h4>
            <p className="muted small">Nothing in here yet. The oud shelf is a good place to start.</p>
            <Link to="/shop/fragrance" className="btn" onClick={cart.closeDrawer}>
              Browse fragrance
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer-ship">
              {cart.freeShippingGap > 0 ? (
                <p className="small">
                  Add <strong>{inr(cart.freeShippingGap)}</strong> more for free shipping
                </p>
              ) : (
                <p className="small drawer-ship-win">
                  <IconTruck size={15} /> Free shipping unlocked
                </p>
              )}
              <div className="progress">
                <span style={{ width: `${cart.freeShippingGap > 0 ? progress : 100}%` }} />
              </div>
            </div>

            <ul className="drawer-items">
              {cart.items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="drawer-item">
                  <Link to={`/product/${item.slug}`} onClick={cart.closeDrawer}>
                    <img src={item.image} alt={item.name} />
                  </Link>
                  <div className="drawer-item-body">
                    <p className="small muted">{item.brand}</p>
                    <Link
                      to={`/product/${item.slug}`}
                      className="drawer-item-name"
                      onClick={cart.closeDrawer}
                    >
                      {item.name}
                    </Link>
                    <p className="small muted">{item.variantLabel}</p>
                    <div className="drawer-item-foot">
                      <QtyStepper
                        size="sm"
                        value={item.qty}
                        max={Math.min(item.stock ?? 10, 10)}
                        onChange={(q) => cart.setQty(item.productId, item.variantId, q)}
                      />
                      <strong>{inr(item.price * item.qty)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="drawer-item-remove"
                    onClick={() => cart.remove(item.productId, item.variantId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <IconTrash size={15} />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="drawer-foot">
              <div className="spread small">
                <span className="muted">Subtotal</span>
                <span>{inr(cart.subtotal)}</span>
              </div>
              <div className="spread small">
                <span className="muted">Import duty &amp; handling</span>
                <span>{inr(cart.importDuty)}</span>
              </div>
              <div className="spread small">
                <span className="muted">Shipping</span>
                <span>{cart.shipping === 0 ? 'Free' : inr(cart.shipping)}</span>
              </div>
              <hr className="divider" style={{ margin: '0.75rem 0' }} />
              <div className="spread drawer-total">
                <span>Total</span>
                <strong>{inr(cart.total)}</strong>
              </div>
              <button
                type="button"
                className="btn btn-block btn-lg"
                onClick={() => {
                  cart.closeDrawer()
                  navigate('/checkout')
                }}
              >
                Checkout
              </button>
              <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={cart.closeDrawer}>
                Keep shopping
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
