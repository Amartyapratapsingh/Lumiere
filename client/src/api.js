/** Thin fetch wrapper. Always sends the session cookie; throws readable errors. */

/**
 * When Clerk is running, it supplies a short-lived session token that has to
 * ride along on every API call. AuthContext registers a getter here at start-up
 * so the rest of the app can keep calling `api.*` without knowing about it.
 */
let getAuthToken = null
export const setTokenGetter = (fn) => { getAuthToken = fn }

async function authHeaders() {
  if (!getAuthToken) return {}
  try {
    const token = await getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(await authHeaders()),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.')
    error.status = res.status
    throw error
  }
  return data
}

const qs = (params) => {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== '' && v != null && v !== 'all') search.set(k, v)
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const api = {
  // auth
  authConfig: () => request('/auth/config'),
  me: () => request('/auth/me'),
  setRole: (body) => request('/auth/role', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateProfile: (body) => request('/auth/me', { method: 'PATCH', body }),

  // catalogue
  products: (params, signal) => request(`/products${qs(params)}`, { signal }),
  product: (slug) => request(`/products/${slug}`),
  meta: () => request('/products/meta'),
  addReview: (slug, body) => request(`/products/${slug}/reviews`, { method: 'POST', body }),

  // orders (consumer)
  placeOrder: (body) => request('/orders', { method: 'POST', body }),
  orders: () => request('/orders'),
  order: (code) => request(`/orders/${code}`),

  // seller
  sellerStats: () => request('/seller/stats'),
  sellerProducts: () => request('/seller/products'),
  createProduct: (body) => request('/seller/products', { method: 'POST', body }),
  updateProduct: (id, body) => request(`/seller/products/${id}`, { method: 'PATCH', body }),
  deleteProduct: (id) => request(`/seller/products/${id}`, { method: 'DELETE' }),
  sellerOrders: () => request('/seller/orders'),
  updateLineStatus: (code, variantId, status) =>
    request(`/seller/orders/${code}/items/${variantId}`, { method: 'PATCH', body: { status } }),

  /** Upload product photos from the seller's machine. `files` is a FileList. */
  async uploadImages(files) {
    const form = new FormData()
    for (const file of files) form.append('images', file)

    const res = await fetch('/api/seller/uploads', {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(), // no Content-Type — the browser sets the multipart boundary
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'That upload failed.')
    return data.images
  },
}

/** ₹ formatting used everywhere — no decimals, Indian digit grouping. */
export const inr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/** "3 days ago" for order timelines. */
export function relativeDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? 'Last month' : `${months} months ago`
}
