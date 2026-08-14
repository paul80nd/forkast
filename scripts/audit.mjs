// UX/accessibility audit pass. Screenshots every page at desktop + mobile in light + dark,
// and runs axe-core against each for automated accessibility findings. Seeds the bundled
// demo dataset (fresh context), so it's safe and self-contained. Review harness, not a test.
//
//   npm run dev            # in another terminal
//   node scripts/audit.mjs [--base http://localhost:5173] [--out /tmp/forkast-audit]
//
// Playwright pins an exact browser build, so a Playwright bump (even a minor) makes launch
// fail until you `npx playwright install chromium` — a ~95 MB download. CI never catches
// this: the gate runs build + test only, never these scripts.

import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const base = arg('base', 'http://localhost:5173')
const out = arg('out', '/tmp/forkast-audit')

const PAGES = ['browse', 'curate', 'plan', 'shop', 'refine', 'config']
const SIZES = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } }

async function newPage(browser, theme, size) {
  const context = await browser.newContext({ viewport: size })
  await context.addInitScript((t) => localStorage.setItem('theme', t), theme)
  return context
}

async function main() {
  await mkdir(out, { recursive: true })
  const browser = await chromium.launch()

  // 1) Screenshots: page × theme × size.
  for (const theme of ['light', 'dark']) {
    for (const [sizeName, size] of Object.entries(SIZES)) {
      const ctx = await newPage(browser, theme, size)
      const page = await ctx.newPage()
      for (const name of PAGES) {
        try {
          await page.goto(`${base}/#/${name}`, { waitUntil: 'networkidle', timeout: 15_000 })
          await page.waitForTimeout(500)
          await page.screenshot({ path: join(out, `${name}-${theme}-${sizeName}.png`), fullPage: true })
        } catch (err) {
          console.log(`  ✗ shot ${name}-${theme}-${sizeName}: ${err.message}`)
        }
      }
      await ctx.close()
    }
  }
  console.log(`Screenshots → ${out}`)

  // 2) Accessibility: axe-core per page (desktop, light — layout-independent findings).
  const ctx = await newPage(browser, 'light', SIZES.desktop)
  const page = await ctx.newPage()
  const report = {}
  for (const name of PAGES) {
    try {
      await page.goto(`${base}/#/${name}`, { waitUntil: 'networkidle', timeout: 15_000 })
      await page.waitForTimeout(500)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      report[name] = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        help: v.help,
        sample: v.nodes[0]?.target?.join(' '),
      }))
    } catch (err) {
      console.log(`  ✗ axe ${name}: ${err.message}`)
    }
  }
  await ctx.close()
  await browser.close()

  await writeFile(join(out, 'axe.json'), JSON.stringify(report, null, 2))
  console.log('\n=== Accessibility (axe-core wcag2a/aa) ===')
  for (const [name, violations] of Object.entries(report)) {
    if (!violations.length) { console.log(`\n${name}: clean`); continue }
    console.log(`\n${name}: ${violations.length} rule(s)`)
    for (const v of violations) {
      console.log(`  [${v.impact}] ${v.id} ×${v.nodes} — ${v.help}`)
      console.log(`      e.g. ${v.sample}`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
