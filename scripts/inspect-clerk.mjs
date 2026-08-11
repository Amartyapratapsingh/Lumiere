/** Dumps the class names Clerk renders, so styling can target real selectors. */
import { spawn } from 'node:child_process'
import { rm, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9666
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = join(ROOT, '.shots', '.edge-inspect')
await mkdir(join(ROOT, '.shots'), { recursive: true })
await rm(profile, { recursive: true, force: true })

const edge = spawn(EDGE, [
  '--headless', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
])
edge.stderr.on('data', () => {})

let targets
for (let i = 0; i < 40; i++) {
  try {
    targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
    if (targets.some((t) => t.type === 'page')) break
  } catch {}
  await sleep(250)
}
const page = targets.find((t) => t.type === 'page')

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  const p = pending.get(m.id)
  if (p) { pending.delete(m.id); p(m.result) }
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:5173/login' })
await sleep(6000)

const { result } = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const out = []
    for (const el of document.querySelectorAll('.clerk-mount *')) {
      const cs = getComputedStyle(el)
      const striped = cs.backgroundImage && cs.backgroundImage !== 'none'
      const tinted = cs.backgroundColor && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(cs.backgroundColor)
      if (striped || tinted) {
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className,
          text: (el.innerText || '').slice(0, 40).replace(/\\n/g, ' '),
          bgImage: striped ? cs.backgroundImage.slice(0, 60) : '',
          bgColor: cs.backgroundColor,
        })
      }
    }
    return out
  })()`,
})

console.log('Elements inside .clerk-mount with a background:\n')
for (const e of result.value ?? []) {
  console.log(`  <${e.tag}> class="${e.cls}"`)
  if (e.text) console.log(`      text: ${e.text}`)
  if (e.bgImage) console.log(`      bg-image: ${e.bgImage}`)
  console.log(`      bg-color: ${e.bgColor}\n`)
}

ws.close()
edge.kill()
process.exit(0)
