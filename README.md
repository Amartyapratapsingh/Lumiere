# Lumière

A two-sided e-commerce marketplace for **imported cosmetics** — oud and attar from the Dubai and
Sharjah souks, Korean barrier care, Milanese colour, Moroccan hammam rituals — sold into India.

There are two kinds of account:

| Account | What they get |
| --- | --- |
| **Shopper** (consumer) | Browse and filter the catalogue, product pages with sizes/shades, wishlist, cart, checkout with import duty, order history and tracking, star ratings and reviews |
| **Seller** | A dashboard with revenue and stock, full product CRUD (sizes, shades, prices, stock, photo uploads from their own machine), and incoming orders they can move through packing → shipped → delivered |

The design combines the two reference layouts: the marketplace structure of the first (oversized
hero wordmark, rounded category tiles, tabbed "hot picks", floating price pills on cards) with the
editorial product page of the second (announcement bar, serif logo, vertical thumbnail rail, variant
chips, quantity stepper, trust-icon strip, accordions) — in a cream / deep-plum / sage / gold palette.

---

## Running it

```bash
npm install
npm run seed     # builds server/data/db.json from the catalogue
npm run dev      # API on :4000, site on http://localhost:5173
```

Then open **http://localhost:5173**.

If `client/public/images` or `client/public/fonts` are missing (they are git-ignored), recreate them:

```bash
npm run images   # 42 product/editorial photos from Pexels
npm run fonts    # self-hosts Playfair Display + Inter so the site works offline
```

### Optional: Clerk and Resend

The site runs without either. Add them when you want real sign-in and real email:

```bash
copy .env.example .env    # Windows   (cp .env.example .env elsewhere)
npm run check:config      # shows exactly what's set and what's missing
```

**Clerk — sign-up and sign-in.** Create a free app at
[dashboard.clerk.com](https://dashboard.clerk.com), open **Configure → API keys**, and copy both
keys into `.env`:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
```

Restart `npm run dev`. Clerk now handles sign-up, sign-in, social login, password reset and MFA —
and the built-in password login switches off automatically. Clerk owns identity; this app still owns
the profile (role, store details, addresses), joined by `user.clerkId`.

New Clerk users are asked once, on `/welcome`, whether they're shopping or selling. If someone signs
up with an email that matches a seeded account — `seller@lumiere.in`, say — that account is
**adopted**, so the demo store keeps its products and order history.

**Resend — transactional email.** Create an account at [resend.com](https://resend.com), make an API
key with *Sending access*, and add:

```
RESEND_API_KEY=re_…
```

Four emails then go out: order confirmation to the shopper, a new-order alert to each seller with
only their own lines, a welcome on sign-up, and a status update when an order ships or is delivered.

The default `RESEND_FROM` uses Resend's shared test sender, which **only delivers to the address you
registered with Resend**. To email anyone else, verify a domain at
[resend.com/domains](https://resend.com/domains) and set `RESEND_FROM="Lumière <orders@yourdomain>"`.

Seeded demo accounts use fake `@lumiere.in` addresses that would bounce, so mail to them is skipped —
set `SELLER_ALERT_OVERRIDE` to your own address to receive those while testing.

With no keys at all, emails print to the terminal so you can still see the whole flow.

### Demo accounts

These work with the built-in login. Once Clerk is switched on you sign up through Clerk instead —
but signing up with one of these email addresses adopts the matching demo account.

| Role | Email | Password |
| --- | --- | --- |
| Shopper | `shopper@lumiere.in` | `shop123` |
| Seller — Attar House Dubai | `seller@lumiere.in` | `seller123` |
| Seller — Seoul Skin Atelier | `seoul@lumiere.in` | `seller123` |
| Seller — Maison Noir | `noir@lumiere.in` | `seller123` |

The sign-in page has one-click buttons for the first two. You can also create a fresh account of
either type at `/signup` — the role picker is the first thing on the form.

---

## How it is put together

```
server/                 Express API (port 4000)
  catalog.js            The seed catalogue: 31 products, 3 seller storefronts, reviews
  seed.js               Rebuilds the database from catalog.js
  db.js                 JSON-file datastore (atomic writes, serialised, mtime-aware cache)
  config.js             Reads .env and decides which integrations are live
  auth.js               Built-in session cookies, password hashing, role guards
  clerk.js              Clerk sessions + syncing Clerk users into the local database
  email.js              Resend templates and sending (console fallback)
  routes/
    auth.js             signup / login / logout / me / profile
    products.js         catalogue, filters + facets, product detail, reviews
    orders.js           checkout, order history
    seller.js           product CRUD, incoming orders, dashboard stats, image library

client/                 React + Vite (port 5173, proxies /api to :4000)
  src/pages/            Storefront pages, plus pages/seller/* for the dashboard
  src/components/       Layout, product card, cart drawer, small UI primitives
  src/context/          Auth, cart/wishlist, toasts
  src/styles/           tokens.css → base.css → components.css → pages.css → seller.css

scripts/                Dev tooling (see below)
```

**Data.** Everything lives in one JSON file, `server/data/db.json`. No database to install. Writes go
through a temp file and a rename so a crash can't truncate it, and are serialised through a promise
chain so concurrent requests can't interleave.

**Auth.** Passwords are bcrypt-hashed. A session is an opaque random token in an `httpOnly` cookie.
Routes are guarded by role — a shopper hitting a seller endpoint gets a 403, and a seller can only
read or modify their own products and their own lines of an order.

**Money.** Prices are INR. Checkout adds a flat 5% customs handling charge and ₹149 shipping, waived
over ₹2,500. Prices and stock are re-read server-side at checkout, so a tampered cart can't set its
own price, and stock is decremented in the same write that records the order.

**Deleting products.** A product that appears in a past order is archived rather than deleted, so
order history stays intact.

**Image uploads.** Sellers pick photos from their own computer (or drop them on the upload area);
they can also paste an image URL. Files are validated by MIME type, capped at 8 MB and 6 per upload,
given a random filename, and written to `server/data/uploads/`. The API serves them at `/uploads/…`
so they survive a client rebuild — in dev, Vite proxies that path through to the API.

**Ratings.** A star rating on its own is enough to submit; the headline and written review are
optional and only appear once a rating is chosen. One rating per person per product, and the
"verified purchase" badge is only applied if that account has actually ordered the item.

---

## Dev scripts

| Command | What it does |
| --- | --- |
| `npm run seed` | Reset the database to the seeded catalogue |
| `npm run smoke` | End-to-end test through the real UI in headless Edge — 31 assertions covering both journeys |
| `npm run check:upload` | Tests image upload (accepts JPEG, rejects non-images, blocks shoppers) and rating-only reviews |
| `npm run check:config` | Reports which integrations are live and what's still missing from `.env` |
| `npm run check:overflow` | Fails if any page scrolls horizontally at 414 / 768 / 1440 px |
| `npm run images` / `npm run fonts` | Re-download assets |

`scripts/shoot-auth.mjs` takes screenshots, including signed-in pages:

```bash
node scripts/shoot-auth.mjs seller@lumiere.in seller123 /seller /seller/orders
node scripts/shoot-auth.mjs anon x /product/oud-mood-elixir --width=414
```

Screenshots land in `.shots/`.

### What the smoke test covers

Sign in → browse a category → open a product → switch size and confirm the price changes → add to
cart → checkout → confirm the order → find it in history → sign in as the seller → see the order
arrive → list a new product → confirm it is searchable and has a working product page → advance the
order line → delete the product. It asserts against rendered DOM, not the API.

---

## Notes and limitations

- **This is a demonstration store.** Brands, sellers, reviews and orders are invented; no payment is
  taken and no email is sent. Uploaded images are stored on disk as-is — a production build would
  want virus scanning, image re-encoding and a size/dimension normalisation step.
- **Photography** is from [Pexels](https://www.pexels.com) under the Pexels licence (free to use, no
  attribution required). Every file is credited in `client/public/images/CREDITS.md`.
- Vite is bound dual-stack (`host: '::'`) because binding IPv6-only makes browsers that resolve
  `localhost` to `127.0.0.1` fail to connect.
- The cart and wishlist live in `localStorage`, so they survive a refresh but are per-browser.
