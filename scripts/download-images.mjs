/**
 * Downloads free-license photography (Pexels) into client/public/images so the
 * storefront works offline. Re-runnable: existing files are skipped.
 *
 * Every photo below is from Pexels and used under the Pexels licence
 * (free for commercial and non-commercial use, no attribution required).
 * Credits are recorded in client/public/images/CREDITS.md for good manners.
 */
import { mkdir, writeFile, access, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'client', 'public', 'images')

/** slug -> { id, w, note } — `id` is the Pexels photo id. */
export const IMAGES = {
  // ---- Fragrance (the Dubai / UAE import story) ----
  'products/oud-mood-elixir': { id: 38721543, note: 'Oud perfume bottle closeup' },
  'products/amber-oud-rouge': { id: 16125095, note: 'Amber oud bottles, minimal backdrop' },
  'products/royal-oud-noir': { id: 30618765, note: 'Oud bottle with rose petals' },
  'products/musk-al-ghazal': { id: 12456278, note: 'Gold cap bottle, Arabic script' },
  'products/rose-attar-absolute': { id: 10786706, note: 'Bottle on reflective surface, petals' },
  'products/citrus-oud-28': { id: 35806942, note: 'Bottle with citrus slices' },
  'products/velvet-bloom': { id: 32645088, note: 'Sleek bottle, pink liquid' },
  'products/nuit-blanche': { id: 1666405, note: 'Stylish bottle casting shadows' },
  'products/sandalwood-sillage': { id: 30981935, note: 'Bottle with aromatic wood' },
  'products/mystique-noir': { id: 35930230, note: 'Luxury bottles on black' },
  'products/fleur-de-lumiere': { id: 35806941, note: 'Bottle with red and white flowers' },
  'products/oud-al-layl': { id: 11482468, note: 'Black oud bottle with roses' },

  // ---- Skincare ----
  'products/hyaluronic-glow-serum': { id: 8101534, note: 'Serum bottle with dropper, shadows' },
  'products/vitamin-c-serum': { id: 15930068, note: 'Serum on pink pedestal' },
  'products/barrier-repair-cream': { id: 13794471, note: 'Open jar of moisture cream' },
  'products/azulene-calming-cream': { id: 29652923, note: 'Purple azulene cream jar' },
  'products/marula-face-oil': { id: 20171275, note: 'Minimal bottle on shell' },
  'products/gold-radiance-serum': { id: 6800936, note: 'Product on black stand' },
  'products/bamboo-hydra-gel': { id: 4173450, note: 'Bamboo lid skincare jar' },
  'products/ceramide-night-cream': { id: 27544670, note: 'Clean cream jar with lid' },
  'products/rose-quartz-mist': { id: 8101529, note: 'Minimalist dropper bottle, shadow play' },

  // ---- Makeup ----
  'products/velvet-matte-lipstick': { id: 7810573, note: 'Two lipsticks on wood' },
  'products/satin-lip-duo': { id: 7256145, note: 'Lipsticks on soft pink' },
  'products/rouge-eclat': { id: 7810567, note: 'Colourful lipsticks, textured surface' },
  'products/lip-gloss-edit': { id: 4938271, note: 'Lip glosses and brushes on marble' },
  'products/coral-crush': { id: 7256118, note: 'Lipsticks and lip pencil, beige' },
  'products/nude-edit-trio': { id: 4022309, note: 'Three lipstick tubes, white' },

  // ---- Bath & body ----
  'products/argan-body-elixir': { id: 8100775, note: 'Bottles with bamboo lids' },
  'products/gua-sha-ritual-set': { id: 8102021, note: 'Serums with gua sha and leaves' },
  'products/hammam-body-polish': { id: 6690232, note: 'Cream jars with green leaves on marble' },
  'products/spa-mineral-soak': { id: 8076229, note: 'Bottles on marble, spa setting' },

  // ---- Category tiles ----
  'categories/fragrance': { id: 15096784, note: 'Luxurious perfume bottle on wood' },
  'categories/skincare': { id: 8100691, note: 'Glass skincare bottles on fabric' },
  'categories/makeup': { id: 1625037, note: 'Four shades of lipstick' },
  'categories/bath-body': { id: 8102129, note: 'Serums, gua sha, bar soap' },
  'categories/gifting': { id: 21008941, note: 'Bag and vial of perfume' },

  // ---- Editorial / hero ----
  'editorial/hero-portrait': { id: 33170460, w: 1400, note: 'Smiling woman, radiant skin' },
  'editorial/glow-ritual': { id: 15327096, w: 1200, note: 'Two women, clean radiant skin' },
  'editorial/gloss-close': { id: 10883300, w: 1200, note: 'Glossy lips, close portrait' },
  'editorial/moody-glam': { id: 9109102, w: 1200, note: 'Makeup, moody lighting' },
  'editorial/luminous-skin': { id: 31579771, w: 1200, note: 'Glistening skin portrait' },
  'editorial/dubai-counter': { id: 35930230, w: 1400, note: 'Luxury bottles, reflective black' },
}

const url = (id, w) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&dpr=2`

const exists = (p) => access(p).then(() => true, () => false)

async function download(slug, { id, w = 900 }) {
  const file = join(OUT, `${slug}.jpg`)
  if (await exists(file)) return { slug, status: 'skipped' }

  await mkdir(dirname(file), { recursive: true })
  const res = await fetch(url(id, w), { headers: { 'User-Agent': 'Mozilla/5.0 (lumiere-seed)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 4096) throw new Error(`suspiciously small (${buf.length}b)`)
  await writeFile(file, buf)
  return { slug, status: 'ok', bytes: buf.length }
}

async function main() {
  const entries = Object.entries(IMAGES)
  console.log(`Downloading ${entries.length} images -> client/public/images\n`)

  const failed = []
  // Small concurrency so we stay polite to the CDN.
  for (let i = 0; i < entries.length; i += 6) {
    const batch = entries.slice(i, i + 6)
    const results = await Promise.all(
      batch.map(async ([slug, meta]) => {
        try {
          return await download(slug, meta)
        } catch (err) {
          failed.push({ slug, id: meta.id, reason: err.message })
          return { slug, status: 'FAILED', reason: err.message }
        }
      })
    )
    for (const r of results) {
      const detail = r.bytes ? `${(r.bytes / 1024).toFixed(0)} kB` : (r.reason ?? '')
      console.log(`  ${r.status.padEnd(8)} ${r.slug.padEnd(34)} ${detail}`)
    }
  }

  const credits = [
    '# Photography credits',
    '',
    'All photographs are from [Pexels](https://www.pexels.com) and used under the',
    'Pexels licence (free to use, no attribution required — credited here anyway).',
    '',
    '| File | Pexels photo | Subject |',
    '| --- | --- | --- |',
    ...entries.map(
      ([slug, m]) =>
        `| \`${slug}.jpg\` | [${m.id}](https://www.pexels.com/photo/${m.id}/) | ${m.note} |`
    ),
    '',
  ].join('\n')
  await writeFile(join(OUT, 'CREDITS.md'), credits)

  const written = (await readdir(OUT, { recursive: true })).filter((f) => f.endsWith('.jpg'))
  console.log(`\nDone. ${written.length} image files on disk.`)
  if (failed.length) {
    console.log(`\n${failed.length} failed:`)
    for (const f of failed) console.log(`  ${f.slug} (id ${f.id}): ${f.reason}`)
    process.exitCode = 1
  }
}

main()
