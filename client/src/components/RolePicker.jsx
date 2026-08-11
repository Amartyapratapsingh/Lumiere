import { IconCheck, IconStore, IconUser } from './Icons.jsx'

/** Survives Clerk's sign-up redirect so the choice isn't lost. */
export const PENDING_ROLE_KEY = 'lumiere.pendingRole'

export const ROLES = [
  {
    id: 'consumer',
    title: 'I’m shopping',
    icon: <IconUser size={20} />,
    blurb: 'Browse imported beauty, save favourites, order and track delivery.',
    perks: ['Free shipping over ₹2,500', 'Duty paid up front', 'Reviews & wishlist'],
  },
  {
    id: 'seller',
    title: 'I’m selling',
    icon: <IconStore size={20} />,
    blurb: 'List the stock you import, manage pricing and fulfil orders from a dashboard.',
    perks: ['No listing fee', 'Your own storefront page', 'Sales & stock dashboard'],
  },
]

export function RolePicker({ value, onChange }) {
  return (
    <div className="role-picker">
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`role-card ${value === r.id ? 'is-on' : ''}`}
          onClick={() => onChange(r.id)}
          aria-pressed={value === r.id}
        >
          <span className="role-icon">{r.icon}</span>
          <strong>{r.title}</strong>
          <span className="small muted">{r.blurb}</span>
          <ul className="role-perks small">
            {r.perks.map((p) => (
              <li key={p}>
                <IconCheck size={12} /> {p}
              </li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  )
}
