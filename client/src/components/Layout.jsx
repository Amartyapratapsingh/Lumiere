import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { CartDrawer } from './CartDrawer.jsx'
import {
  IconBag, IconChevron, IconClose, IconMenu, IconSearch, IconUser, IconStore, IconGlobe,
} from './Icons.jsx'

const ANNOUNCEMENTS = [
  'Free shipping across India on orders over ₹2,500',
  'Customs & import duty handled — no surprise charges at your door',
  'New arrivals from the Deira souk landing every Thursday',
]

const SHOP_MENU = [
  { to: '/shop/fragrance', label: 'Fragrance', hint: 'Oud, attar & EDP' },
  { to: '/shop/skincare', label: 'Skincare', hint: 'Serums & creams' },
  { to: '/shop/makeup', label: 'Makeup', hint: 'Lips & colour' },
  { to: '/shop/bath-body', label: 'Bath & Body', hint: 'Hammam rituals' },
  { to: '/shop/gifting', label: 'Gifting', hint: 'Sets & discovery boxes' },
]

function AnnouncementBar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ANNOUNCEMENTS.length), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="announce">
      <div className="page announce-inner">
        <span className="announce-side small">
          <IconGlobe size={13} /> Imported from Dubai · Seoul · Milan
        </span>
        <p key={index} className="announce-msg">{ANNOUNCEMENTS[index]}</p>
        <span className="announce-side small announce-right">Ships in 2–5 days</span>
      </div>
    </div>
  )
}

function SearchBar({ onDone }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    navigate(`/shop?q=${encodeURIComponent(term)}`)
    setQ('')
    onDone?.()
  }

  return (
    <form className="search-bar" onSubmit={submit} role="search">
      <IconSearch size={17} />
      <input
        className="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search oud, serums, lipstick…"
        aria-label="Search products"
        autoFocus
      />
      <button type="button" className="icon-btn" onClick={onDone} aria-label="Close search">
        <IconClose size={16} />
      </button>
    </form>
  )
}

function AccountMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!e.target.closest('.acct')) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  if (!user) {
    return (
      <Link to="/login" className="icon-btn" aria-label="Sign in">
        <IconUser size={18} />
      </Link>
    )
  }

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="acct">
      <button
        type="button"
        className="acct-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="avatar">{initials}</span>
        <IconChevron size={14} dir={open ? 'up' : 'down'} />
      </button>

      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-head">
            <p className="acct-name">{user.name}</p>
            <p className="acct-email small muted">{user.email}</p>
            <span className={`badge ${user.role === 'seller' ? 'badge-gold' : 'badge-sage'}`}>
              {user.role === 'seller' ? 'Seller account' : 'Shopper account'}
            </span>
          </div>

          <div className="acct-links">
            {user.role === 'seller' ? (
              <>
                <Link to="/seller" role="menuitem" onClick={() => setOpen(false)}>Dashboard</Link>
                <Link to="/seller/products" role="menuitem" onClick={() => setOpen(false)}>My products</Link>
                <Link to="/seller/orders" role="menuitem" onClick={() => setOpen(false)}>Orders to fulfil</Link>
              </>
            ) : (
              <>
                <Link to="/account" role="menuitem" onClick={() => setOpen(false)}>My account</Link>
                <Link to="/orders" role="menuitem" onClick={() => setOpen(false)}>My orders</Link>
                <Link to="/wishlist" role="menuitem" onClick={() => setOpen(false)}>Wishlist</Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="acct-signout"
            onClick={async () => {
              await logout()
              setOpen(false)
              navigate('/')
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const cart = useCart()
  const { user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setShopOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="page header-inner">
        <button
          type="button"
          className="icon-btn header-burger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <IconMenu size={19} />
        </button>

        <Link to="/" className="logo" aria-label="Lumière home">
          Lumière
          <span className="logo-mark">®</span>
        </Link>

        {searching ? (
          <SearchBar onDone={() => setSearching(false)} />
        ) : (
          <nav className="header-nav" aria-label="Primary">
            <div
              className="nav-drop"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button
                type="button"
                className="nav-link"
                onClick={() => setShopOpen((o) => !o)}
                aria-expanded={shopOpen}
              >
                Shop <IconChevron size={13} dir={shopOpen ? 'up' : 'down'} />
              </button>

              {shopOpen && (
                <div className="mega">
                  <div className="mega-links">
                    {SHOP_MENU.map((item) => (
                      <Link key={item.to} to={item.to}>
                        <strong>{item.label}</strong>
                        <span className="small muted">{item.hint}</span>
                      </Link>
                    ))}
                  </div>
                  <Link to="/shop" className="mega-feature">
                    <img src="/images/editorial/dubai-counter.jpg" alt="" />
                    <div>
                      <span className="eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>The full shelf</span>
                      <strong>Shop everything</strong>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Plain Link: NavLink ignores the query string, so this would light
                up as "active" on every /shop route. */}
            <Link to="/shop?sort=newest" className="nav-link">New in</Link>
            <NavLink to="/brands" className="nav-link">Brands</NavLink>
            <NavLink to="/about" className="nav-link">Our story</NavLink>
            {!user && (
              <NavLink to="/sell" className="nav-link nav-link-accent">Sell on Lumière</NavLink>
            )}
          </nav>
        )}

        <div className="header-actions">
          {!searching && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearching(true)}
              aria-label="Search"
            >
              <IconSearch size={18} />
            </button>
          )}

          {user?.role === 'seller' && (
            <Link to="/seller" className="btn btn-ghost btn-sm header-seller-cta">
              <IconStore size={15} /> Dashboard
            </Link>
          )}

          <AccountMenu />

          <button
            type="button"
            className="icon-btn cart-btn"
            onClick={cart.openDrawer}
            aria-label={`Cart, ${cart.count} items`}
          >
            <IconBag size={18} />
            {cart.count > 0 && <span className="cart-count">{cart.count}</span>}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          <div className="mobile-head spread">
            <span className="logo">Lumière</span>
            <button type="button" className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <IconClose size={18} />
            </button>
          </div>
          <nav className="mobile-nav">
            <p className="eyebrow">Shop by category</p>
            {SHOP_MENU.map((item) => (
              <Link key={item.to} to={item.to}>{item.label}</Link>
            ))}
            <hr className="divider" />
            <Link to="/shop">Everything</Link>
            <Link to="/brands">Brands</Link>
            <Link to="/about">Our story</Link>
            <Link to="/sell">Sell on Lumière</Link>
            <hr className="divider" />
            {user ? (
              <Link to={user.role === 'seller' ? '/seller' : '/account'}>
                {user.role === 'seller' ? 'Seller dashboard' : 'My account'}
              </Link>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/signup">Create an account</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="page">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="logo logo-light">Lumière<span className="logo-mark">®</span></span>
            <p>
              A marketplace for imported beauty. We verify every seller, clear every parcel through
              customs ourselves, and refuse anything with less than a year of shelf life left.
            </p>
            <div className="footer-pills">
              <span className="pill-soft">Dubai</span>
              <span className="pill-soft">Sharjah</span>
              <span className="pill-soft">Seoul</span>
              <span className="pill-soft">Milan</span>
              <span className="pill-soft">Grasse</span>
              <span className="pill-soft">Marrakech</span>
            </div>
          </div>

          <div className="footer-cols">
            <div>
              <h4>Shop</h4>
              <Link to="/shop/fragrance">Fragrance</Link>
              <Link to="/shop/skincare">Skincare</Link>
              <Link to="/shop/makeup">Makeup</Link>
              <Link to="/shop/bath-body">Bath & Body</Link>
              <Link to="/shop/gifting">Gifting</Link>
            </div>
            <div>
              <h4>Account</h4>
              <Link to="/login">Sign in</Link>
              <Link to="/signup">Create account</Link>
              <Link to="/orders">Track an order</Link>
              <Link to="/wishlist">Wishlist</Link>
            </div>
            <div>
              <h4>Sellers</h4>
              <Link to="/sell">Sell on Lumière</Link>
              <Link to="/signup?role=seller">Open a store</Link>
              <Link to="/brands">Our importers</Link>
            </div>
            <div>
              <h4>Help</h4>
              <Link to="/about">Our story</Link>
              <Link to="/about#authenticity">Authenticity</Link>
              <Link to="/about#shipping">Shipping & duty</Link>
              <Link to="/about#returns">Returns</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="small">© {new Date().getFullYear()} Lumière Retail Pvt. Ltd. · Mumbai, India</p>
          <p className="small">
            A demonstration storefront. Brands, sellers and orders here are fictional.
          </p>
        </div>
      </div>
    </footer>
  )
}

export function Layout({ children }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  )
}
