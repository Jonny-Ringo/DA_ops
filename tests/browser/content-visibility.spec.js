import { test, expect } from '@playwright/test'

test('content stays readable when JavaScript cannot load', async ({ page }) => {
  await page.route('**/*', route => {
    const request = route.request()
    return request.resourceType() === 'script' || !request.url().startsWith('http://127.0.0.1:4173')
      ? route.abort() : route.continue()
  })
  for (const path of ['/', '/about.html', '/how-we-work.html', '/contact.html']) {
    await page.goto(path)
    const hidden = await page.locator('.fade-up').evaluateAll(elements => elements.filter(el => getComputedStyle(el).opacity === '0').length)
    expect(hidden, path).toBe(0)
  }
})

test('built homepage initializes and every section stays readable', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173') ? route.continue() : route.abort())
  await page.goto('/')
  await expect(page.locator('.project-strip-ready')).toHaveCount(1)
  const blocks = page.locator('main > section')
  expect(await blocks.count()).toBeGreaterThan(0)
  for (const block of await blocks.all()) {
    await block.scrollIntoViewIfNeeded()
    await expect(block).toHaveCSS('opacity', '1')
  }
  expect(errors).toEqual([])
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://daops.net/')
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://daops.net/')
})
