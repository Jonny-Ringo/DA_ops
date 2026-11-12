import { test, expect } from '@playwright/test'

test.use({ javaScriptEnabled: false })

test('old HTML routes and retired pages return 404 without redirects', async ({ page }) => {
  const origin = process.env.PLAYWRIGHT_BASE_URL
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  for (const path of ['/about.html', '/contact.html', '/community-management.html', '/discord-community-management-scope.html', '/technical-support-escalation.html', '/privacy.html', '/analytics.html', '/how-we-work.html', '/the-eye.html', '/how-we-work/', '/the-eye/']) {
    const response = await page.request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(404)
    expect(response.headers().location, path).toBeUndefined()
    expect(await response.text(), path).not.toMatch(/http-equiv="refresh"/i)
  }
})

test('every content page is crawlable with working local links and fragment targets', async ({ page }) => {
  test.setTimeout(60000)
  const origin = process.env.PLAYWRIGHT_BASE_URL
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  const pending = ['/'], visited = new Set(), targets = new Set(), markup = new Map()
  while (pending.length) {
    const path = pending.shift()
    if (visited.has(path)) continue
    visited.add(path)
    const response = await page.goto(path)
    expect(response.status(), path).toBe(200)
    markup.set(path, await response.text())
    await expect(page.locator('main h1')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://daops.net${path}`)
    for (const image of await page.locator('img').all()) expect(await image.getAttribute('alt')).not.toBeNull()
    for (const href of await page.locator('a[href]').evaluateAll(links => links.map(link => link.href))) {
      const url = new URL(href)
      if (url.origin !== origin) continue
      targets.add(url.pathname + url.hash)
      if (!visited.has(url.pathname)) pending.push(url.pathname)
    }
  }
  for (const path of ['/community-management/', '/discord-community-management-scope/', '/technical-support-escalation/']) expect(visited.has(path), `${path} must be reachable from home`).toBe(true)
  for (const target of targets) {
    const url = new URL(target, origin)
    if (!url.hash) continue
    const id = decodeURIComponent(url.hash.slice(1))
    expect(markup.get(url.pathname), target).toContain(`id="${id}"`)
  }
})
