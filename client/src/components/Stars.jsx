import { IconStar } from './Icons.jsx'

/** Read-only rating display. Half stars are rounded to the nearest whole. */
export function Stars({ value = 0, size = 15, showValue = false, count }) {
  const rounded = Math.round(value)
  return (
    <span className="stars" title={`${value} out of 5`}>
      <span className="stars-glyphs" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <IconStar key={n} size={size} fill={n <= rounded ? 'currentColor' : 'none'} />
        ))}
      </span>
      <span className="visually-hidden">{value} out of 5</span>
      {showValue && <span className="stars-value">{value.toFixed(1)}</span>}
      {count != null && (
        <span className="stars-count">
          {count} {count === 1 ? 'review' : 'reviews'}
        </span>
      )}
    </span>
  )
}

/** Interactive version for the review form. */
export function StarPicker({ value, onChange, size = 26 }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= value ? 'is-on' : ''}
          onClick={() => onChange(n)}
        >
          <IconStar size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}
