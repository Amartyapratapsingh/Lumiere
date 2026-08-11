/**
 * Tiny JSON-file datastore. Everything lives in server/data/db.json.
 *
 * Writes are serialised through a promise chain and go via a temp file + rename
 * so a crash mid-write can't leave a truncated database behind.
 */
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'data')
const FILE = join(DIR, 'db.json')

const EMPTY = { users: [], products: [], orders: [], reviews: [], sessions: [] }

let cache = null
let cacheStamp = 0 // mtime of the file the cache was built from
let writeChain = Promise.resolve()

const mtime = async () => {
  try {
    return (await stat(FILE)).mtimeMs
  } catch {
    return 0
  }
}

export async function load() {
  // Re-read when the file changed underneath us — otherwise running
  // `npm run seed` against a live server would leave this process holding a
  // stale copy and silently write it back over the fresh data.
  if (cache && (await mtime()) === cacheStamp) return cache

  if (!existsSync(FILE)) {
    cache = structuredClone(EMPTY)
    await persist()
    return cache
  }
  const raw = await readFile(FILE, 'utf8')
  cache = { ...structuredClone(EMPTY), ...JSON.parse(raw) }
  cacheStamp = await mtime()
  return cache
}

async function persist() {
  await mkdir(DIR, { recursive: true })
  const tmp = `${FILE}.tmp`
  await writeFile(tmp, JSON.stringify(cache, null, 2))
  await rename(tmp, FILE)
  cacheStamp = await mtime()
}

/** Run `fn(db)` then flush to disk. Returns whatever `fn` returns. */
export function mutate(fn) {
  writeChain = writeChain.then(async () => {
    const db = await load()
    const result = await fn(db)
    await persist()
    return result
  })
  return writeChain
}

/** Replace the whole database (used by the seeder). */
export async function replaceAll(next) {
  cache = { ...structuredClone(EMPTY), ...next }
  await persist()
  return cache
}

/** Reset the in-memory copy so the next load() re-reads from disk. */
export function invalidate() {
  cache = null
  cacheStamp = 0
}

export const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
