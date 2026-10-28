import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Run against a built local preview: node scripts/measure-site.mjs before|after
// Repeatable lab comparison, not field Core Web Vitals or an INP measurement.
const label = process.argv[2]
if (!['before', 'after'].includes(label)) throw new Error('Use before or after as the report label')
const origin = 'http://127.0.0.1:4173'
const directory = new URL(`../audit/conversion-${label}/`, import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch()
const report = { date: new Date().toISOString(), browser: browser.version(), origin, label, conditions: 'Cold browser contexts; external requests blocked (including fonts); built local preview; 3 runs per profile; no field or INP claims.', runs: [] }
try {
  for (const profile of ['desktop', 'mobile']) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ viewport: profile === 'mobile' ? { width: 390, height: 844 } : { width: 1363, height: 936 } })
      await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
      if (profile === 'mobile') {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
      }
      await page.addInitScript(() => {
        window.labMetrics = { lcp: null, cls: 0 }
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.labMetrics.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
        let start = 0, last = 0, score = 0
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue
            if (entry.startTime - last > 1000 || entry.startTime - start > 5000) { start = entry.startTime; score = 0 }
            last = entry.startTime
            score += entry.value
            window.labMetrics.cls = Math.max(window.labMetrics.cls, score)
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.goto(origin, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0]
        const resources = performance.getEntriesByType('resource').filter(entry => entry.name.startsWith(location.origin))
        return { ...window.labMetrics, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, domContentLoaded: nav.domContentLoadedEventEnd, transferBytes: nav.transferSize + resources.reduce((sum, item) => sum + item.transferSize, 0), requests: resources.length + 1, eyeTop: document.querySelector('.featured-project').getBoundingClientRect().top }
      })
      report.runs.push({ profile, run, ...metrics })
      await context.close()
    }
  }
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  for (const width of [360, 390, 430, 768, 1024, 1363]) {
    await page.setViewportSize({ width, height: 936 })
    for (const path of ['/', '/contact.html', '/about.html', '/how-we-work.html']) {
      await page.goto(origin + path)
      for (const section of await page.locator('main > section').all()) await section.scrollIntoViewIfNeeded()
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }) })
      await page.screenshot({ path: fileURLToPath(new URL(`${path === '/' ? 'home' : path.slice(1, -5)}-${width}.png`, directory)), fullPage: true })
    }
  }
  await writeFile(new URL('performance.json', directory), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
