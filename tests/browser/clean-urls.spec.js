import { test, expect } from '@playwright/test'
import { pages } from '../../scripts/seo.mjs'

for (const prefix of ['/', `/${'a'.repeat(43)}/`]) {
  test(`folder pages load assets and navigation at ${prefix === '/' ? 'the site root' : 'a snapshot prefix'}`, async ({ page }) => {
    const origin = process.env.PLAYWRIGHT_BASE_URL
    const failures = [], errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) failures.push(response.url())
    })
    await page.addInitScript(() => localStorage.setItem('da.analytics.optout', 'true'))
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin !== origin) return route.abort()
      // Serve only the mounted snapshot, so absolute paths cannot silently escape it.
      if (!url.pathname.startsWith(prefix)) return route.fulfill({ status: 404, body: '' })
      if (prefix === '/') return route.continue()
      const response = await route.fetch({ url: `${origin}/${url.pathname.slice(prefix.length)}${url.search}` })
      return route.fulfill({ response })
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const { path } of Object.values(pages)) {
      const response = await page.goto(prefix + path)
      expect(response.status(), path).toBe(200)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://daops.net/${path}`)
      for (const image of await page.locator('img:visible').all()) {
        await image.scrollIntoViewIfNeeded()
        await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
      }
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true)
      }
      const home = page.locator('.logo, .analytics-header a').first()
      await expect(home).toHaveAttribute('href', path ? '../' : './')
    }
    await page.goto(`${prefix}community-management/`)
    await page.locator('#nav-links').getByRole('link', { name: 'About', exact: true }).click()
    await expect(page).toHaveURL(`${origin}${prefix}about/`)
    await expect(page.locator('#nav-links [aria-current="page"]')).toHaveText('About')
    await page.locator('.logo').click()
    await expect(page).toHaveURL(`${origin}${prefix}`)
    expect(failures).toEqual([])
    expect(errors).toEqual([])
  })
}
