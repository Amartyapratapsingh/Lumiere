import { useEffect, useState } from 'react'
import { IconChevron, IconMinus, IconPlus } from './Icons.jsx'

/** Quantity stepper from reference 2 — bordered pill with − value + */
export function QtyStepper({ value, onChange, min = 1, max = 10, size = 'md' }) {
  return (
    <div className={`qty ${size === 'sm' ? 'qty-sm' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <IconMinus size={size === 'sm' ? 13 : 16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <IconPlus size={size === 'sm' ? 13 : 16} />
      </button>
    </div>
  )
}

/** Detail / Ingredients / Shipping accordions on the product page. */
export function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`accordion ${open ? 'is-open' : ''}`}>
      <button type="button" className="accordion-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <IconChevron size={18} dir={open ? 'up' : 'down'} />
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  )
}

/** Scroll to top whenever the route changes. */
export function ScrollToTop({ pathname }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

/** Small labelled figure used on dashboards and the hero stat block. */
export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  )
}

/** Trust row under Add to Cart — mirrors reference 2's four-icon strip. */
export function TrustRow({ items }) {
  return (
    <ul className="trust-row">
      {items.map(({ icon, label }) => (
        <li key={label}>
          {icon}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}
