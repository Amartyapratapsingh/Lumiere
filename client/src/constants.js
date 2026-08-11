/** Shared with the server — keep in step with server/routes/orders.js. */
export const FREE_SHIPPING_OVER = 2500
export const SHIPPING_FLAT = 149
export const DUTY_RATE = 0.05

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'discount', label: 'Biggest saving' },
]

export const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled']

export const STATUS_LABEL = {
  placed: 'Order placed',
  processing: 'Packing',
  shipped: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const STATUS_TONE = {
  placed: 'badge-lilac',
  processing: 'badge-gold',
  shipped: 'badge-blush',
  delivered: 'badge-sage',
  cancelled: 'badge-danger',
}

/** Category options offered in the seller product form. */
export const SELLER_CATEGORIES = [
  { value: 'fragrance', label: 'Fragrance' },
  { value: 'skincare', label: 'Skincare' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'bath-body', label: 'Bath & Body' },
]

export const BADGE_CHOICES = [
  'Best seller',
  'New in',
  'Editor’s pick',
  'Limited stock',
  'Gift favourite',
  'Value set',
  'Fragrance-free',
  'Alcohol-free',
  'Clean formula',
  'Dermatologist tested',
  'Oil-free',
  'Fair trade',
  'Luxury',
  'Multi-use',
]

export const CONCERN_CHOICES = [
  'Daily wear',
  'Evening wear',
  'Office safe',
  'Long lasting',
  'Long wear',
  'Layering',
  'Summer',
  'Winter',
  'Gifting',
  'Dryness',
  'Oiliness',
  'Sensitive skin',
  'Redness',
  'Acne',
  'Pigmentation',
  'Dullness',
  'Ageing',
  'Texture',
  'Puffiness',
  'Relaxation',
]
