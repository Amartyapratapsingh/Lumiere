/**
 * Finds elements wider than the viewport — i.e. whatever is making a page
 * scroll sideways. Run against the dev server at a set of widths.
 *
 *   node scripts/check-overflow.mjs 414 768 1440
 */
import { spawn } from 'node:child_process'
import { rm, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const WEB = 'http://127.0.0.1:5173'
const PORT = 9555

const ROUTES = ['/', '/shop', '/shop/fragrance', '/product/oud-mood-elixir', '/about', '/brands', '/sell', '/login', '/signup']
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class CDP {
  #ws; #id = 0; #pending = new Map()
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
    if (!page) throw new Error('no page target')
    const cdp = new CDP()
    await cdp.#connect(page.webSocketDebuggerUrl)
    return cdp
  }
  #connect(url) {
    return new Promise((resolve, reject) => {
      this.#ws = new WebSocket(url)
      this.#ws.onopen = resolve
      this.#ws.onerror = () => reject(new Error('socket error'))
      this.#ws.onmessage = (e) => {
        const m = JSON.parse(e.data)
        const p = this.#pending.get(m.id)
        if (!p) return
        this.#pending.delete(m.id)
        m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.#id
    this.#ws.send(JSON.stringify({ id, method, params }))
    return new Promise((res, rej) => this.#pending.set(id, { resolve: res, reject: rej }))
  }
  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description)
    return result.value
  }
  close() { this.#ws.close() }
}

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth
  const scrollW = document.documentElement.scrollWidth
  const offenders = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    // Ignore things that legitimately scroll inside their own box.
    let p = el.parentElement, contained = false
    while (p && p !== document.body) {
      const ov = getComputedStyle(p).overflowX
      if (ov === 'auto' || ov === 'scroll' || ov === 'hidden') { contained = true; break }
      p = p.parentElement
    }
    if (contained) continue
    if (r.right > vw + 1 || r.width > vw + 1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 3).join('.'),
        width: Math.round(r.width),
        right: Math.round(r.right),
      })
    }
  }
  // Report only the outermost few, de-duplicated by class signature.
  const seen = new Set()
  const unique = offenders.filter(o => {
    const k = o.tag + '.' + o.cls
    if (seen.has(k)) return false
    seen.add(k); return true
  })
  return { vw, scrollW, overflow: scrollW > vw + 1, offenders: unique.slice(0, 8) }
})()`

async function main() {
  const profile = join(ROOT, '.shots', '.edge-overflow')
  await mkdir(join(ROOT, '.shots'), { recursive: true })
  await rm(profile, { recursive: true, force: true })

  const edge = spawn(EDGE, [
    '--headless', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
  ])
  edge.stderr.on('data', () => {})

  const page = await CDP.attach(PORT)
  await page.send('Page.enable')
  await page.send('Runtime.enable')

  let problems = 0
  for (const width of WIDTHS) {
    console.log(`\n═══ ${width}px ═══`)
    await page.send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width < 700,
    })
    for (const route of ROUTES) {
      await page.send('Page.navigate', { url: `${WEB}${route}` })
      await sleep(1800)
      const r = await page.eval(PROBE)
      if (r.overflow) {
        problems++
        console.log(`  OVERFLOW  ${route.padEnd(26)} scrollWidth ${r.scrollW} > ${r.vw}`)
        for (const o of r.offenders) {
          console.log(`            ${o.tag}.${o.cls}  w=${o.width} right=${o.right}`)
        }
      } else {
        console.log(`  ok        ${route}`)
      }
    }
  }

  page.close()
  edge.kill()
  console.log(`\n${problems === 0 ? 'No horizontal overflow anywhere.' : `${problems} page/width combinations overflow.`}`)
  if (problems) process.exitCode = 1
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
