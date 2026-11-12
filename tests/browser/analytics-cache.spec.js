import { test, expect } from '@playwright/test'
import { DataItem } from 'arbundles'
import { APP_NAME, SITE_ID, VERSION, dateRange, eventTags } from '../../src/scripts/analytics-core.js'
import { CACHE_APP, CACHE_VERSION, LOCAL_KEY, DAY, pack, windowsFor, digest, cacheTags } from '../../src/scripts/cache-format.js'

const now = Date.now()
const week = windowsFor(dateRange(30, now), now).filter(w => w.closed).at(-1)
const record = { tx: 'a'.repeat(43), id: crypto.randomUUID(), session: crypto.randomUUID(), type: 'page_view', page: '/', detail: '', time: Date.parse(week.end + 'T12:00:00Z'), source: 'linkedin', medium: 'social', campaign: 'launch', content: '', device: 'desktop' }
function responseFor(request) {
  const tags = Object.fromEntries(request.postDataJSON().variables.tags.map(t => [t.name, t.values]))
  const edges = tags.Timestamp?.includes(week.end) ? [{ cursor: record.tx, node: { id: record.tx, tags: eventTags(record) } }] : []
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ data: { transactions: { pageInfo: { hasNextPage: false }, edges } } }) }
}

test('cached history renders immediately and chart focus survives background status updates', async ({ page }) => {
  const pending = []
  let hold = true, uploads = 0
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: LOCAL_KEY, value: JSON.stringify({ version: CACHE_VERSION, windows: [{ start: week.start, checkedAt: now - DAY, events: pack([record]) }] }) })
  await page.route('**/*', async route => {
    const url = route.request().url()
    if (url.endsWith('/graphql')) {
      if (hold) { pending.push(route); return }
      return route.fulfill(responseFor(route.request()))
    }
    if (url === 'https://up.arweave.net/tx') uploads++
    return url.startsWith(process.env.PLAYWRIGHT_BASE_URL) ? route.continue() : route.abort()
  })
  await page.goto('/analytics/')
  await expect(page.locator('#status')).toContainText('1 events loaded')
  await expect.poll(() => pending.length).toBeGreaterThanOrEqual(2)
  const first = page.locator('.analytics-day').first()
  await first.focus()
  await expect(page.locator('#chart-tooltip')).toContainText(': 0 page views')
  hold = false
  for (const route of pending) await route.fulfill(responseFor(route.request()))
  await expect(page.locator('#status')).toContainText('Checked against indexed records')
  await expect(first).toBeFocused()
  await expect(page.locator('#chart-tooltip')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#chart-tooltip')).toBeHidden()
  const active = page.locator(`[data-date="${week.end}"]`)
  await active.hover()
  await expect(page.locator('#chart-tooltip')).toHaveText(week.end + ': 1 page views')
  await active.click()
  await expect(active).toBeFocused()
  await page.getByText('Daily totals', { exact: true }).click()
  await expect(page.locator('#daily-totals tbody tr')).toHaveCount(30)
  expect(uploads).toBe(0)
})

test('changing period cancels old queries and cannot restore stale counts', async ({ page }) => {
  const pending = []
  let hold = true
  await page.route('**/*', route => {
    if (route.request().url().endsWith('/graphql')) {
      if (hold) { pending.push(route); return }
      return route.fulfill(responseFor(route.request()))
    }
    return route.request().url().startsWith(process.env.PLAYWRIGHT_BASE_URL) ? route.continue() : route.abort()
  })
  await page.goto('/analytics/')
  await expect.poll(() => pending.length).toBeGreaterThanOrEqual(2)
  hold = false
  await page.locator('#period').selectOption('1')
  await expect(page.locator('#status')).toContainText('Checked against indexed records')
  await expect(page.locator('.analytics-day')).toHaveCount(1)
  for (const route of pending) await route.fulfill(responseFor(route.request())).catch(() => {})
  await expect(page.locator('#metrics strong').first()).toHaveText('0')
  await expect(page.locator('.analytics-day')).toHaveCount(1)
})

test('stalled shared-cache downloads cannot delay fresh history or replace it later', async ({ page }) => {
  const manifestId = 'M'.repeat(43), partId = 'P'.repeat(43)
  const rows = pack([record]), hash = await digest(rows)
  const late = { ...record, id: crypto.randomUUID(), tx: 'b'.repeat(43) }
  let release, partRequested = false, uploads = 0
  const stalled = new Promise(resolve => { release = resolve })
  await page.route('**/*', async route => {
    const url = route.request().url()
    if (url.startsWith(process.env.PLAYWRIGHT_BASE_URL)) return route.continue()
    if (url === 'https://up.arweave.net/tx') uploads++
    if (url === `https://arweave.net/${manifestId}`) return route.fulfill({ json: {
      version: CACHE_VERSION, source: APP_NAME, site: SITE_ID, eventVersion: VERSION,
      start: week.start, end: week.end, createdAt: now - 1000, hash, count: 1,
      parts: [{ id: partId, hash }],
    } })
    if (url === `https://arweave.net/${partId}`) {
      partRequested = true
      await stalled
      return route.fulfill({ json: rows }).catch(() => {})
    }
    if (url.endsWith('/graphql')) {
      const tags = Object.fromEntries(route.request().postDataJSON().variables.tags.map(t => [t.name, t.values]))
      const edges = tags['App-Name'][0] === CACHE_APP
        ? [{ cursor: 'cached', node: { id: manifestId, tags: cacheTags(week, 'manifest', hash) } }]
        : tags.Timestamp.includes(week.end)
          ? [record, late].map(e => ({ cursor: e.tx, node: { id: e.tx, tags: eventTags(e) } }))
          : []
      return route.fulfill({ json: { data: { transactions: { pageInfo: { hasNextPage: false }, edges } } } })
    }
    return route.abort()
  })
  try {
    await page.goto('/analytics/')
    await expect(page.locator('#status')).toContainText('Checked against indexed records', { timeout: 4000 })
    expect(partRequested).toBe(true)
    await expect(page.locator('#metrics strong').first()).toHaveText('2')
    release()
    await expect(page.locator('#metrics strong').first()).toHaveText('2')
    expect(uploads).toBe(0)
  } finally { release() }
})

for (const mode of ['allowed', 'optout', 'dnt', 'gpc', 'storage-denied', 'http']) {
  test(`shared-cache production publishing respects ${mode}`, async ({ page }) => {
    const uploads = [], errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(mode => {
      if (mode === 'optout') localStorage.setItem('da.analytics.optout', 'true')
      if (mode === 'dnt') Object.defineProperty(navigator, 'doNotTrack', { value: '1' })
      if (mode === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { value: true })
      if (mode === 'storage-denied') Object.defineProperty(window, 'localStorage', { get() { throw new Error('Denied') } })
    }, mode)
    const origin = `${mode === 'http' ? 'http' : 'https'}://preview.example`
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin === origin) return route.fulfill({ response: await page.request.get(process.env.PLAYWRIGHT_BASE_URL + url.pathname) })
      if (url.pathname === '/graphql') return route.fulfill(responseFor(route.request()))
      if (url.href === 'https://up.arweave.net/tx') {
        const item = new DataItem(route.request().postDataBuffer())
        expect(await item.isValid()).toBe(true)
        expect(item.tags.find(t => t.name === 'App-Name').value).toBe(CACHE_APP)
        uploads.push(item)
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: item.id, winc: '0' }) })
      }
      return route.abort()
    })
    await page.goto(origin + '/analytics/')
    await expect(page.locator('#status')).toContainText('Checked against indexed records')
    if (mode === 'allowed') {
      await expect(page.locator('#status')).toContainText('1 shared snapshots saved')
      expect(uploads).toHaveLength(2)
      expect(uploads.at(-1).tags.find(t => t.name === 'Cache-Kind').value).toBe('manifest')
    } else expect(uploads).toHaveLength(0)
    expect(errors).toEqual([])
  })
}
