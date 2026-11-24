import { test, expect } from '@playwright/test'

test.use({ javaScriptEnabled: false })

test('community URLs return HTTP 301 and preserve the complete campaign query', async ({ page }) => {
  const origin = process.env.PLAYWRIGHT_BASE_URL
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  for (const path of ['/community-management', '/community-management/', '/community-management/index.html']) {
    for (const query of ['', '?utm_source=email&utm_medium=cold_email&utm_campaign=community_support&utm_content=intro', '?utm_campaign=a%20b&tag=one&tag=two&value=a%2Bb%26c']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await page.request.fetch(path + query, { method, maxRedirects: 0 })
        expect(response.status()).toBe(301)
        expect(response.headers().location).toBe('/' + query)
        expect(response.headers()['cache-control']).toBe('no-store')
      }
    }
  }
  const query = '?utm_source=email&utm_medium=cold_email&utm_campaign=community_support'
  const response = await page.goto('/community-management/' + query + '#services')
  expect(response.status()).toBe(200)
  await expect(page).toHaveURL(origin + '/' + query + '#services')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://daops.net/')
  await expect(page.locator('h1')).toHaveText('Technical Community Management & Support')
})

test('combined homepage keeps the requested sections together on desktop and mobile', async ({ page }) => {
  const origin = process.env.PLAYWRIGHT_BASE_URL
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto('/')
  await expect(page.locator('main h2')).toHaveText([
    'When to bring us in',
    'Support that understands your product',
    'The Eye: Arweave & AO analytics',
    'Plan your support setup',
    'Common questions',
    'Experience That Counts',
  ])
  await expect(page.locator('#services .scope-block')).toHaveCount(4)
  await expect(page.locator('.relevant-experience .project-strip')).toHaveCount(1)
  await expect(page.locator('.relevant-experience')).toContainText('2,000 support tickets')
  await expect(page.locator('.relevant-experience')).toContainText('100,000 members')
  await expect(page.locator('.relevant-experience a[href="./about/#project-experience"]')).toHaveCount(1)
  await expect(page.locator('a[href*="/community-management/"]')).toHaveCount(0)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const need = await page.locator('.start-grid > div').first().boundingBox()
    const sprint = await page.locator('.starting-offer').boundingBox()
    if (width > 900) {
      expect(Math.abs(sprint.y - need.y)).toBeLessThan(2)
      expect(sprint.x).toBeGreaterThan(need.x + need.width)
    } else {
      expect(sprint.y).toBeGreaterThan(need.y + need.height)
      expect(Math.abs(sprint.x - need.x)).toBeLessThan(2)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
