import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr } from '../../api.js'
import { useToast } from '../../context/ToastContext.jsx'
import { SellerShell } from './SellerNav.jsx'
import { EmptyState } from '../../components/Bits.jsx'
import { IconEdit, IconPlus, IconStore, IconTrash } from '../../components/Icons.jsx'

export default function SellerProducts() {
  const toast = useToast()
  const [products, setProducts] = useState(null)
  const [filter, setFilter] = useState('all')
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState('')

  const load = () => api.sellerProducts().then((d) => setProducts(d.products)).catch(() => setProducts([]))

  useEffect(() => {
    load()
  }, [])

  const toggleStatus = async (product) => {
    const next = product.status === 'active' ? 'draft' : 'active'
    setBusy(product.id)
    try {
      await api.updateProduct(product.id, { status: next })
      setProducts((ps) => ps.map((p) => (p.id === product.id ? { ...p, status: next } : p)))
      toast.success(next === 'active' ? `${product.name} is live` : `${product.name} moved to drafts`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const remove = async (product) => {
    setBusy(product.id)
    try {
      const { archived } = await api.deleteProduct(product.id)
      setConfirming(null)
      await load()
      toast.success(
        archived
          ? `${product.name} archived — it appears in past orders so we kept the record.`
          : `${product.name} deleted`
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const visible = (products ?? []).filter((p) => (filter === 'all' ? true : p.status === filter))

  const counts = {
    all: products?.length ?? 0,
    active: products?.filter((p) => p.status === 'active').length ?? 0,
    draft: products?.filter((p) => p.status === 'draft').length ?? 0,
    archived: products?.filter((p) => p.status === 'archived').length ?? 0,
  }

  return (
    <SellerShell
      title="Your products"
      subtitle="Publish, pause or edit anything you carry."
      action={
        <Link to="/seller/products/new" className="btn btn-sm">
          <IconPlus size={14} /> Add product
        </Link>
      }
    >
      <div className="row wrap" style={{ marginBottom: 'var(--gap-md)' }}>
        {['all', 'active', 'draft', 'archived'].map((f) => (
          <button
            key={f}
            type="button"
            className="chip"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)} <span className="muted">{counts[f]}</span>
          </button>
        ))}
      </div>

      {products === null ? (
        <div className="route-loading"><span className="spinner" /></div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<IconStore size={24} />}
          title={filter === 'all' ? 'No products yet' : `Nothing in ${filter}`}
          action={
            <Link to="/seller/products/new" className="btn">
              <IconPlus size={15} /> Add your first product
            </Link>
          }
        >
          List what you import — sizes, prices and stock are all set per variant.
        </EmptyState>
      ) : (
        <div className="table-wrap scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="row">
                      <img className="table-thumb" src={p.images[0]} alt="" />
                      <div>
                        <Link to={`/product/${p.slug}`} className="table-name">{p.name}</Link>
                        <p className="small muted">{p.brand} · {p.variants.length} variants</p>
                      </div>
                    </div>
                  </td>
                  <td className="small">{p.category.replace('-', ' & ')}</td>
                  <td>
                    <strong>{inr(p.price)}</strong>
                    {p.discountPct > 0 && <span className="small muted"> −{p.discountPct}%</span>}
                  </td>
                  <td>
                    <span className={p.stock === 0 ? 'stock-out' : p.stock <= 10 ? 'stock-low' : ''}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        p.status === 'active' ? 'badge-sage' : p.status === 'draft' ? 'badge-gold' : 'badge-danger'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="row table-actions">
                      {p.status !== 'archived' && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleStatus(p)}
                          disabled={busy === p.id}
                        >
                          {p.status === 'active' ? 'Unpublish' : 'Publish'}
                        </button>
                      )}
                      <Link to={`/seller/products/${p.id}/edit`} className="icon-btn" aria-label={`Edit ${p.name}`}>
                        <IconEdit size={16} />
                      </Link>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setConfirming(p)}
                        aria-label={`Delete ${p.name}`}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <div className="drawer-root">
          <div className="drawer-scrim" onClick={() => setConfirming(null)} />
          <div className="modal" role="dialog" aria-modal="true" aria-label="Confirm delete">
            <h3>Delete “{confirming.name}”?</h3>
            <p className="muted">
              If this product appears in a past order we will archive it instead of deleting, so order
              history stays intact.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--gap-md)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => remove(confirming)}
                disabled={busy === confirming.id}
              >
                {busy === confirming.id ? <span className="spinner" /> : 'Delete product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SellerShell>
  )
}
