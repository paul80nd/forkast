// Drive the running app with Playwright and screenshot every page in light + dark mode.
// A fresh browser context seeds the bundled demo dataset (no private data), so shots are
// safe to keep. For visual/UX review — pairs with a live dev or preview server.
//
//   npm run dev            # in one terminal (or: npm run preview after a build)
//   node scripts/screenshots.mjs [--base http://localhost:5173] [--out /tmp/forkast-shots]
//                               [--width 1280] [--height 900]
//
// HashRouter, so routes are /#/<page>. Theme is localStorage 'theme' ('dark'|'light'),
// applied before first paint by the inline script in index.html — set it via addInitScript.
//
// Playwright pins an exact browser build, so a Playwright bump (even a minor) makes launch
// fail until you `npx playwright install chromium` — a ~95 MB download. CI never catches
// this: the gate runs build + test only, never these scripts.

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const base = arg('base', 'http://localhost:5173')
const out = arg('out', '/tmp/forkast-shots')
const width = Number(arg('width', '1280'))
const height = Number(arg('height', '900'))

const PAGES = ['browse', 'curate', 'plan', 'shop', 'refine', 'config']

async function shoot(browser, theme) {
  const context = await browser.newContext({ viewport: { width, height } })
  // Seed the theme before any app code runs so there's no light→dark flash in the shot.
  await context.addInitScript((t) => localStorage.setItem('theme', t), theme)
  const page = await context.newPage()

  for (const name of PAGES) {
    try {
      await page.goto(`${base}/#/${name}`, { waitUntil: 'networkidle', timeout: 15_000 })
      await page.waitForTimeout(600) // let images/live queries settle
      const file = join(out, `${name}-${theme}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log(`  ✓ ${file}`)
    } catch (err) {
      console.log(`  ✗ ${name}-${theme}: ${err.message}`)
    }
  }

  // A recipe detail page too — find the first recipe link on Browse and follow it.
  try {
    await page.goto(`${base}/#/browse`, { waitUntil: 'networkidle', timeout: 15_000 })
    const href = await page.locator('a[href*="/recipe/"]').first().getAttribute('href')
    if (href) {
      await page.goto(`${base}/${href.replace(/^#?\/?/, '#/').replace('#//', '#/')}`, {
        waitUntil: 'networkidle',
        timeout: 15_000,
      })
      await page.waitForTimeout(600)
      const file = join(out, `recipe-${theme}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log(`  ✓ ${file}`)
    }
  } catch (err) {
    console.log(`  ✗ recipe-${theme}: ${err.message}`)
  }

  await context.close()
}

async function main() {
  await mkdir(out, { recursive: true })
  const browser = await chromium.launch()
  console.log(`Screenshotting ${base} → ${out} (${width}×${height})`)
  for (const theme of ['light', 'dark']) {
    console.log(`\n${theme}:`)
    await shoot(browser, theme)
  }
  await browser.close()
  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
