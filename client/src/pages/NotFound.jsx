import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page section">
      <div className="empty">
        <p className="serif" style={{ fontSize: 'var(--step-5)', lineHeight: 1, color: 'var(--line-strong)' }}>
          404
        </p>
        <h3>This page has been discontinued</h3>
        <p>The link may be old, or the product it pointed to has sold out and been delisted.</p>
        <div className="row wrap" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
          <Link to="/" className="btn">Back to home</Link>
          <Link to="/shop" className="btn btn-ghost">Browse the shop</Link>
        </div>
      </div>
    </div>
  )
}
