/**
 * Authenticated screenshots.
 *
 * The plain `--screenshot` CLI flag can't carry a session cookie, so this logs
 * in against the API, then drives headless Edge over the DevTools Protocol to
 * install the cookie and capture each route.
 *
 *   node scripts/shoot-auth.mjs seller@lumiere.in seller123 /seller /seller/products
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.shots')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const API = 'http://127.0.0.1:4000'
const WEB = 'http://127.0.0.1:5173'
const PORT = 9333

// Pass "anon" as the email to capture signed-out pages.
// Optional --width=414 renders with mobile device emulation.
const argv = process.argv.slice(2)
const widthArg = argv.find((a) => a.startsWith('--width='))
const WIDTH = widthArg ? Number(widthArg.split('=')[1]) : 1440
const HEIGHT = WIDTH < 700 ? 1400 : 1150
const [email, password, ...routes] = argv.filter((a) => !a.startsWith('--'))

if (!email || !routes.length) {
  console.error('usage: node scripts/shoot-auth.mjs <email|anon> <password> <route...> [--width=414]')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const slug = (route) => (route === '/' ? 'root' : route.replace(/^\//, '').replace(/[\/?=&#.]/g, '-'))

/** Log in against the API and pull the session cookie out of Set-Cookie. */
async function getSessionCookie() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login failed: ${(await res.json()).error}`)
  const raw = res.headers.get('set-cookie') ?? ''
  const match = raw.match(/lumiere_sid=([^;]+)/)
  if (!match) throw new Error('no session cookie returned')
  const { user } = await res.json()
  return { value: match[1], user }
}

/** Minimal CDP client over the global WebSocket in Node 22+. */
class CDP {
  #ws
  #id = 0
  #pending = new Map()

  static async attach(port) {
    // The browser needs a moment before /json/list answers.
    let targets
    for (let i = 0; i < 40; i++) {
      try {
        targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
        if (targets.some((t) => t.type === 'page')) break
      } catch {}
      await sleep(250)
    }
    const page = targets?.find((t) => t.type === 'page')
    if (!page) throw new Error('no debuggable page target found')

    const cdp = new CDP()
    await cdp.#connect(page.webSocketDebuggerUrl)
    return cdp
  }

  #connect(url) {
    return new Promise((resolve, reject) => {
      this.#ws = new WebSocket(url)
      this.#ws.onopen = resolve
      this.#ws.onerror = () => reject(new Error('CDP socket error'))
      this.#ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        const pending = this.#pending.get(msg.id)
        if (!pending) return
        this.#pending.delete(msg.id)
        msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result)
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.#id
    this.#ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }))
  }

  close() {
    this.#ws.close()
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const session = email === 'anon' ? null : await getSessionCookie()
  console.log(
    session ? `signed in as ${session.user.name} (${session.user.role})\n` : `anonymous · ${WIDTH}px\n`
  )

  const profile = join(OUT, '.edge-profile')
  await rm(profile, { recursive: true, force: true })

  const edge = spawn(EDGE, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    'about:blank',
  ])
  edge.stderr.on('data', () => {}) // Edge is chatty on stderr; ignore.

  const cdp = await CDP.attach(PORT)
  await cdp.send('Page.enable')
  await cdp.send('Network.enable')
  // Emulation is what actually sets the CSS viewport — --window-size alone
  // leaves media queries evaluating against a desktop-width layout viewport.
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: WIDTH < 700,
  })
  if (session) {
    await cdp.send('Network.setCookie', {
      name: 'lumiere_sid',
      value: session.value,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
    })
  }

  for (const route of routes) {
    // "path#selector" scrolls that element into view before capturing — the
    // app's ScrollToTop would otherwise defeat a plain anchor.
    const [path, target] = route.split('#')
    await cdp.send('Page.navigate', { url: `${WEB}${path}` })
    // Let React fetch, render, and decode images before we capture.
    await sleep(3500)

    if (target) {
      await cdp.send('Runtime.evaluate', {
        expression: `document.querySelector('#${target}, .${target}')?.scrollIntoView({ block: 'start' })`,
      })
      await sleep(900)
    }

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
    const file = join(OUT, `${slug(route)}.png`)
    await writeFile(file, Buffer.from(data, 'base64'))
    console.log(`  ${route.padEnd(28)} -> .shots/${slug(route)}.png`)
  }

  cdp.close()
  edge.kill()
}

// Exit explicitly — killing Edge doesn't always reap its child processes, which
// would otherwise keep this process alive.
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message)
    process.exit(1)
  })
