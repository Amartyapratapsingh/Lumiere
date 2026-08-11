/**
 * End-to-end smoke test driven through the real UI in headless Edge.
 *
 * Walks the consumer journey (browse -> PDP -> variant -> add to cart ->
 * checkout -> order confirmation) and the seller journey (dashboard -> new
 * product -> appears on the storefront), asserting on rendered DOM.
 *
 *   node scripts/smoke.mjs
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.shots')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const WEB = 'http://127.0.0.1:5173'
const PORT = 9444

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let passed = 0
const failures = []

function check(label, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

class CDP {
  #ws
  #id = 0
  #pending = new Map()

  static async attach(port) {
    let targets
    for (let i = 0; i < 40; i++) {
      try {
        targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
        if (targets.some((t) => t.type === 'page')) break
      } catch {}
      await sleep(250)
    }
    const page = targets?.find((t) => t.type === 'page')
    if (!page) throw new Error('no debuggable page target')
    const cdp = new CDP()
    await cdp.#connect(page.webSocketDebuggerUrl)
    return cdp
  }

  #connect(url) {
    return new Promise((resolve, reject) => {
      this.#ws = new WebSocket(url)
      this.#ws.onopen = resolve
      this.#ws.onerror = () => reject(new Error('CDP socket error'))
      this.#ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        const p = this.#pending.get(msg.id)
        if (!p) return
        this.#pending.delete(msg.id)
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.#id
    this.#ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }))
  }

  /** Evaluate an expression in the page and return its value. */
  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'eval failed')
    return result.value
  }

  async goto(path, settle = 2200) {
    await this.send('Page.navigate', { url: `${WEB}${path}` })
    await sleep(settle)
  }

  /** Click the first element matching a CSS selector, optionally by text. */
  async click(selector, text = null, settle = 900) {
    const ok = await this.eval(`(() => {
      const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})]
      const el = ${text ? `nodes.find(n => n.textContent.trim().includes(${JSON.stringify(text)}))` : 'nodes[0]'}
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      el.click()
      return true
    })()`)
    await sleep(settle)
    return ok
  }

  async type(selector, value) {
    return this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return false
      const setter = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(el, ${JSON.stringify(value)})
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`)
  }

  text() {
    return this.eval('document.body.innerText')
  }

  url() {
    return this.eval('location.pathname + location.search')
  }

  async shot(name) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
  }

  close() {
    this.#ws.close()
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const profile = join(OUT, '.edge-smoke')
  await rm(profile, { recursive: true, force: true })

  const edge = spawn(EDGE, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1440,1150', 'about:blank',
  ])
  edge.stderr.on('data', () => {})

  const page = await CDP.attach(PORT)
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1150, deviceScaleFactor: 1, mobile: false,
  })

  try {
    // ─────────── consumer journey ───────────
    console.log('\nCONSUMER — sign in')
    await page.goto('/login')
    await page.type('#lg-email', 'shopper@lumiere.in')
    await page.type('#lg-pass', 'shop123')
    await page.click('.auth-form button.btn', null, 2500)
    check('lands on the storefront after login', (await page.url()) === '/')
    check('header shows the signed-in avatar', await page.eval('!!document.querySelector(".avatar")'))

    console.log('\nCONSUMER — browse and open a product')
    await page.goto('/shop/fragrance')
    const cardCount = await page.eval('document.querySelectorAll(".pcard").length')
    check('fragrance grid renders 12 products', cardCount === 12, `got ${cardCount}`)

    await page.goto('/product/oud-mood-elixir')
    check('PDP shows the product name', (await page.text()).includes('Oud Mood Elixir'))
    check('PDP renders the thumbnail rail', (await page.eval('document.querySelectorAll(".pdp-thumb").length')) === 4)

    // Pick the 100 ml variant, which should change the displayed price.
    const priceBefore = await page.eval('document.querySelector(".pdp-price strong").textContent')
    await page.click('.chip-variant', '100 ml')
    const priceAfter = await page.eval('document.querySelector(".pdp-price strong").textContent')
    check('choosing a size updates the price', priceBefore !== priceAfter, `${priceBefore} -> ${priceAfter}`)
    check('100 ml price is correct', priceAfter.replace(/[^\d]/g, '') === '4299', priceAfter)

    console.log('\nCONSUMER — add to cart')
    await page.click('.pdp-actions .btn', null, 1200)
    const drawer = await page.text()
    check('cart drawer opens with the item', drawer.includes('Your bag') && drawer.includes('Oud Mood Elixir'))
    check('cart badge counts one item', (await page.eval('document.querySelector(".cart-count")?.textContent')) === '1')
    await page.shot('smoke-cart-drawer')

    console.log('\nCONSUMER — checkout')
    await page.goto('/checkout')
    check('checkout lists the line item', (await page.text()).includes('Oud Mood Elixir'))
    for (const [sel, val] of [
      ['#ck-name', 'Ananya Sharma'],
      ['#ck-l1', 'B-402, Sunraise Residency'],
      ['#ck-l2', 'Linking Road, Bandra West'],
      ['#ck-city', 'Mumbai'],
      ['#ck-state', 'Maharashtra'],
      ['#ck-pin', '400050'],
      ['#ck-phone', '9987022145'],
    ]) {
      await page.type(sel, val)
    }
    await page.shot('smoke-checkout')
    await page.click('.checkout-summary button.btn', null, 3000)

    const orderUrl = await page.url()
    check('redirects to the order confirmation', /^\/order\/LM-\d+/.test(orderUrl), orderUrl)
    const confirmation = await page.text()
    check('confirmation thanks the shopper', confirmation.includes('Thank you'))
    check('confirmation shows the tracker', confirmation.includes('Order placed'))
    check('cart is emptied after ordering', !(await page.eval('!!document.querySelector(".cart-count")')))
    await page.shot('smoke-order-placed')

    console.log('\nCONSUMER — order history')
    await page.goto('/orders')
    const placedCode = orderUrl.replace('/order/', '')
    check('new order appears in history', (await page.text()).includes(placedCode), placedCode)

    // Detail view reached from history should NOT use the celebratory copy.
    await page.click('.order-card .link-arrow', null, 1800)
    const detail = await page.text()
    check('order detail drops the thank-you heading', !detail.includes('Thank you'))
    check('order detail still shows the code', detail.includes(placedCode))

    // ─────────── seller journey ───────────
    console.log('\nSELLER — sign in and list a product')
    await page.goto('/login')
    await page.eval('document.querySelector(".acct-signout")?.click()')
    await page.goto('/login')
    await page.type('#lg-email', 'seller@lumiere.in')
    await page.type('#lg-pass', 'seller123')
    await page.click('.auth-form button.btn', null, 2500)
    check('seller lands on the dashboard', (await page.url()) === '/seller')

    const dash = await page.text()
    check('dashboard shows the store name', dash.includes('Attar House Dubai'))
    check('dashboard shows revenue', /Total revenue/.test(dash))
    check('the new order reached the seller', dash.includes('Awaiting fulfilment'))

    // Clear anything a previous interrupted run left behind, so slugs don't collide.
    await page.goto('/seller/products')
    for (let i = 0; i < 5; i++) {
      const found = await page.eval(`(() => {
        const row = [...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('Smoke Test Attar'))
        row?.querySelector('.table-actions .icon-btn:last-child')?.click()
        return Boolean(row)
      })()`)
      if (!found) break
      await sleep(600)
      await page.click('.modal .btn-danger', null, 1600)
    }

    await page.goto('/seller/products/new')
    await page.type('#pf-name', 'Smoke Test Attar')
    await page.type('#pf-brand', 'Test House')
    await page.type('#pf-origin', 'Deira, Dubai · UAE')
    await page.type(
      '#pf-desc',
      'A smoke-test listing created by scripts/smoke.mjs to prove the seller product form works end to end.'
    )
    await page.type('.variant-row .input:nth-child(1)', '50 ml')
    await page.eval(`(() => {
      const row = document.querySelector('.variant-row')
      const inputs = row.querySelectorAll('input')
      const set = (el, v) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      set(inputs[0], '50 ml'); set(inputs[1], '1999'); set(inputs[2], '2499'); set(inputs[3], '7')
      return true
    })()`)

    // Add an image by pasting a URL (the upload path needs a real file dialog,
    // and is covered separately by scripts/check-upload.mjs).
    await page.eval(`(() => {
      const el = document.querySelector('#pf-url')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        .call(el, '/images/products/musk-al-ghazal.jpg')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      return true
    })()`)
    await sleep(500)
    check('an image was added', (await page.eval('document.querySelectorAll(".picked").length')) >= 1)
    check('upload zone is present', await page.eval('!!document.querySelector(".upload-drop")'))
    await page.shot('smoke-product-form')

    await page.click('.product-form-side .panel:last-child .btn', null, 2600)
    check('returns to the product list after saving', (await page.url()) === '/seller/products')
    check('new product is listed', (await page.text()).includes('Smoke Test Attar'))

    console.log('\nSELLER — product reaches the storefront')
    await page.goto('/shop?q=Smoke%20Test%20Attar')
    check('new product is searchable by shoppers', (await page.text()).includes('Smoke Test Attar'))

    // Follow the row's own link rather than guessing the slug — a name collision
    // legitimately produces a suffixed slug.
    await page.goto('/seller/products')
    const productPath = await page.eval(`(() => {
      const row = [...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('Smoke Test Attar'))
      const link = row?.querySelector('a.table-name')
      return link ? new URL(link.href).pathname : null
    })()`)
    check('product list links to the new product', Boolean(productPath), String(productPath))

    await page.goto(productPath)
    const pdp = await page.text()
    check('new product has a working PDP', pdp.includes('Smoke Test Attar') && pdp.includes('Attar House Dubai'))
    check('new product shows its price', pdp.includes('1,999'))

    console.log('\nSELLER — fulfil the order')
    await page.goto('/seller/orders')
    const advanced = await page.click('.seller-order-actions .btn', null, 1800)
    check('can advance an order line', advanced)
    await page.shot('smoke-seller-orders')

    console.log('\nCLEANUP — remove the smoke-test product')
    await page.goto('/seller/products')
    await page.eval(`(() => {
      const row = [...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('Smoke Test Attar'))
      row?.querySelector('.table-actions .icon-btn:last-child')?.click()
      return true
    })()`)
    await sleep(700)
    await page.click('.modal .btn-danger', null, 2000)
    // Assert against the table, not the whole page: the success toast repeats
    // the product name for a few seconds and would mask a real failure.
    const stillListed = await page.eval(
      `[...document.querySelectorAll('tbody tr')].some(r => r.textContent.includes('Smoke Test Attar'))`
    )
    check('smoke-test product removed', !stillListed)
  } finally {
    page.close()
    edge.kill()
  }

  console.log(`\n${'─'.repeat(56)}`)
  console.log(`${passed} passed, ${failures.length} failed`)
  if (failures.length) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  - ${f}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('SMOKE RUN CRASHED:', err.message)
  process.exit(1)
})
