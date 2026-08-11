import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { IconChart, IconBox, IconStore, IconPlus } from '../../components/Icons.jsx'

const LINKS = [
  { to: '/seller', label: 'Overview', icon: <IconChart size={16} />, end: true },
  { to: '/seller/products', label: 'Products', icon: <IconStore size={16} /> },
  { to: '/seller/orders', label: 'Orders', icon: <IconBox size={16} /> },
]

/** Shared header for every seller screen. */
export function SellerShell({ title, subtitle, action, children }) {
  const { user } = useAuth()

  return (
    <div className="seller">
      <div className="seller-top">
        <div className="page">
          <div className="seller-top-inner">
            <div>
              <span className="eyebrow">Seller dashboard</span>
              <h1>{user.storeName}</h1>
              <p className="small">
                {user.city ? `${user.city} · ` : ''}
                {user.country} {user.since ? `· Selling since ${user.since}` : ''}
              </p>
            </div>
            <NavLink to="/seller/products/new" className="btn btn-light">
              <IconPlus size={15} /> Add product
            </NavLink>
          </div>

          <nav className="seller-tabs" aria-label="Seller sections">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="seller-tab">
                {l.icon} {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="page seller-body">
        {(title || action) && (
          <div className="section-head">
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
