import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, inr } from '../../api.js'
import { useToast } from '../../context/ToastContext.jsx'
import { SellerShell } from './SellerNav.jsx'
import { BADGE_CHOICES, CONCERN_CHOICES, SELLER_CATEGORIES } from '../../constants.js'
import { IconClose, IconPlus, IconTrash } from '../../components/Icons.jsx'

const BLANK_VARIANT = { label: '', price: '', mrp: '', stock: '' }

const BLANK = {
  name: '',
  brand: '',
  category: 'fragrance',
  origin: '',
  tagline: '',
  description: '',
  howToUse: '',
  ingredients: '',
  images: [],
  variants: [{ ...BLANK_VARIANT }],
  badges: [],
  concern: [],
  status: 'active',
  notes: { top: '', heart: '', base: '' },
}

export default function SellerProductForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    if (!editing) return
    api
      .sellerProducts()
      .then((d) => {
        const p = d.products.find((x) => x.id === id)
        if (!p) {
          setError('That product could not be found in your store.')
          return
        }
        setForm({
          ...BLANK,
          ...p,
          notes: p.notes ?? { top: '', heart: '', base: '' },
          variants: p.variants.map((v) => ({ ...v, mrp: v.mrp ?? '' })),
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, editing])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const setVariant = (index, field, value) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    }))

  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { ...BLANK_VARIANT }] }))

  const removeVariant = (index) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.length === 1 ? f.variants : f.variants.filter((_, i) => i !== index),
    }))

  const toggleIn = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }))

  const removeImage = (src) => setForm((f) => ({ ...f, images: f.images.filter((i) => i !== src) }))

  const addImage = (src) =>
    setForm((f) => (f.images.includes(src) ? f : { ...f, images: [...f.images, src] }))

  /** Upload whatever the seller picked in the OS file dialog. */
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList ?? [])
    if (!files.length) return

    setUploadError('')
    setUploading(true)
    try {
      const paths = await api.uploadImages(files)
      setForm((f) => ({ ...f, images: [...f.images, ...paths] }))
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = '' // allow re-picking the same file
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    const payload = {
      ...form,
      // Drop the fragrance-notes block unless something was actually typed in.
      notes:
        form.category === 'fragrance' && (form.notes.top || form.notes.heart || form.notes.base)
          ? form.notes
          : null,
      variants: form.variants.filter((v) => v.label.trim()),
    }

    try {
      if (editing) {
        await api.updateProduct(id, payload)
        toast.success('Product updated')
      } else {
        await api.createProduct(payload)
        toast.success('Product listed')
      }
      navigate('/seller/products')
    } catch (err) {
      setError(err.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <SellerShell>
        <div className="route-loading"><span className="spinner" /></div>
      </SellerShell>
    )
  }

  return (
    <SellerShell
      title={editing ? 'Edit product' : 'Add a product'}
      subtitle={editing ? 'Changes go live the moment you save.' : 'List something you import.'}
      action={
        <Link to="/seller/products" className="btn btn-ghost btn-sm">
          Cancel
        </Link>
      }
    >
      <form onSubmit={submit} className="product-form">
        <div className="stack" style={{ gap: 'var(--gap-md)' }}>
          {error && <div className="notice notice-error">{error}</div>}

          <section className="panel">
            <h3>The basics</h3>
            <div className="form-grid" style={{ marginTop: 'var(--gap)' }}>
              <div className="field span-2">
                <label htmlFor="pf-name">Product name</label>
                <input id="pf-name" className="input" value={form.name} onChange={set('name')} placeholder="Oud Mood Elixir" required />
              </div>
              <div className="field">
                <label htmlFor="pf-brand">Brand</label>
                <input id="pf-brand" className="input" value={form.brand} onChange={set('brand')} placeholder="Lattafa Shabab" required />
              </div>
              <div className="field">
                <label htmlFor="pf-cat">Category</label>
                <select id="pf-cat" className="select" value={form.category} onChange={set('category')}>
                  {SELLER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pf-origin">Imported from</label>
                <input id="pf-origin" className="input" value={form.origin} onChange={set('origin')} placeholder="Deira, Dubai · UAE" />
              </div>
              <div className="field">
                <label htmlFor="pf-tag">One-line pitch</label>
                <input id="pf-tag" className="input" value={form.tagline} onChange={set('tagline')} placeholder="Smoky oud with a long amber drydown" />
              </div>
              <div className="field span-2">
                <label htmlFor="pf-desc">Description</label>
                <textarea
                  id="pf-desc"
                  className="textarea"
                  value={form.description}
                  onChange={set('description')}
                  placeholder="How does it smell or feel? Who is it for? How long does it last?"
                  required
                />
                <span className="hint">{form.description.length} characters — at least 20 needed.</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="spread">
              <h3>Sizes, shades &amp; stock</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addVariant}>
                <IconPlus size={14} /> Add variant
              </button>
            </div>
            <p className="small muted" style={{ marginTop: '0.4rem' }}>
              Each row becomes a selectable chip on the product page. Price is what the shopper pays; MRP is
              struck through beside it.
            </p>

            <div className="variant-rows">
              <div className="variant-head small muted">
                <span>Label</span>
                <span>Price (₹)</span>
                <span>MRP (₹)</span>
                <span>Stock</span>
                <span />
              </div>

              {form.variants.map((v, i) => (
                <div key={i} className="variant-row">
                  <input
                    className="input"
                    value={v.label}
                    onChange={(e) => setVariant(i, 'label', e.target.value)}
                    placeholder={form.category === 'makeup' ? 'Shade 04 — Brick' : '100 ml'}
                    aria-label={`Variant ${i + 1} label`}
                  />
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={v.price}
                    onChange={(e) => setVariant(i, 'price', e.target.value)}
                    placeholder="4299"
                    aria-label={`Variant ${i + 1} price`}
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={v.mrp}
                    onChange={(e) => setVariant(i, 'mrp', e.target.value)}
                    placeholder="5499"
                    aria-label={`Variant ${i + 1} MRP`}
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={v.stock}
                    onChange={(e) => setVariant(i, 'stock', e.target.value)}
                    placeholder="20"
                    aria-label={`Variant ${i + 1} stock`}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeVariant(i)}
                    disabled={form.variants.length === 1}
                    aria-label={`Remove variant ${i + 1}`}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3>Detail</h3>
            <div className="stack" style={{ marginTop: 'var(--gap)' }}>
              {form.category === 'fragrance' && (
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="pf-top">Top notes</label>
                    <input
                      id="pf-top"
                      className="input"
                      value={form.notes.top}
                      onChange={(e) => setForm((f) => ({ ...f, notes: { ...f.notes, top: e.target.value } }))}
                      placeholder="Saffron, Nutmeg"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pf-heart">Heart notes</label>
                    <input
                      id="pf-heart"
                      className="input"
                      value={form.notes.heart}
                      onChange={(e) => setForm((f) => ({ ...f, notes: { ...f.notes, heart: e.target.value } }))}
                      placeholder="Agarwood, Rose"
                    />
                  </div>
                  <div className="field span-2">
                    <label htmlFor="pf-base">Base notes</label>
                    <input
                      id="pf-base"
                      className="input"
                      value={form.notes.base}
                      onChange={(e) => setForm((f) => ({ ...f, notes: { ...f.notes, base: e.target.value } }))}
                      placeholder="Amber, Leather, Musk"
                    />
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="pf-use">How to use</label>
                <textarea id="pf-use" className="textarea" value={form.howToUse} onChange={set('howToUse')} />
              </div>
              <div className="field">
                <label htmlFor="pf-ing">Ingredients</label>
                <textarea id="pf-ing" className="textarea" value={form.ingredients} onChange={set('ingredients')} />
              </div>
            </div>
          </section>

          <section className="panel">
            <h3>Labels</h3>
            <div className="stack" style={{ marginTop: 'var(--gap)' }}>
              <div className="field">
                <span className="label">Badges <span className="muted">(shown on the card)</span></span>
                <div className="filter-chips">
                  {BADGE_CHOICES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="chip"
                      aria-pressed={form.badges.includes(b)}
                      onClick={() => toggleIn('badges', b)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Concern &amp; occasion <span className="muted">(powers filters)</span></span>
                <div className="filter-chips">
                  {CONCERN_CHOICES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="chip"
                      aria-pressed={form.concern.includes(c)}
                      onClick={() => toggleIn('concern', c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ---- sticky side rail ---- */}
        <aside className="product-form-side">
          <div className="panel">
            <h3>Images</h3>
            <p className="small muted" style={{ marginTop: '0.35rem' }}>
              The first image is the one shoppers see on cards. Drag to reorder is not needed — remove
              and re-add to change the order.
            </p>

            {form.images.length > 0 && (
              <div className="picked-images">
                {form.images.map((src, i) => (
                  <div key={src} className="picked">
                    <img src={src} alt="" />
                    {i === 0 && <span className="badge badge-light picked-main">Main</span>}
                    <button type="button" onClick={() => removeImage(src)} aria-label="Remove image">
                      <IconClose size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Opens the operating system's own file dialog. */}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="visually-hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <button
              type="button"
              className="upload-drop"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('is-over')
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove('is-over')}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('is-over')
                handleFiles(e.dataTransfer.files)
              }}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner" />
                  <strong>Uploading…</strong>
                </>
              ) : (
                <>
                  <span className="upload-icon"><IconPlus size={18} /></span>
                  <strong>Upload from your computer</strong>
                  <span className="small muted">Click to browse, or drop images here</span>
                  <span className="hint">JPG, PNG, WebP or AVIF · up to 8 MB each</span>
                </>
              )}
            </button>

            {uploadError && (
              <div className="notice notice-error" style={{ marginTop: 'var(--gap-sm)' }}>
                {uploadError}
              </div>
            )}

            <div className="field" style={{ marginTop: 'var(--gap)' }}>
              <label htmlFor="pf-url" className="small">Or paste an image URL</label>
              <input
                id="pf-url"
                className="input"
                placeholder="https://…"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  const url = e.currentTarget.value.trim()
                  if (url) {
                    addImage(url)
                    e.currentTarget.value = ''
                  }
                }}
              />
              <span className="hint">Press Enter to add.</span>
            </div>
          </div>

          <div className="panel">
            <h3>Publish</h3>
            <div className="field" style={{ marginTop: 'var(--gap)' }}>
              <label htmlFor="pf-status">Status</label>
              <select id="pf-status" className="select" value={form.status} onChange={set('status')}>
                <option value="active">Live — visible to shoppers</option>
                <option value="draft">Draft — hidden for now</option>
              </select>
            </div>

            {form.variants[0]?.price && (
              <p className="small muted" style={{ marginTop: 'var(--gap-sm)' }}>
                Listing from <strong>{inr(Math.min(...form.variants.filter((v) => v.price).map((v) => Number(v.price))))}</strong>
              </p>
            )}

            <button className="btn btn-block" style={{ marginTop: 'var(--gap)' }} disabled={busy}>
              {busy ? <span className="spinner" /> : editing ? 'Save changes' : 'List product'}
            </button>
          </div>
        </aside>
      </form>

    </SellerShell>
  )
}
