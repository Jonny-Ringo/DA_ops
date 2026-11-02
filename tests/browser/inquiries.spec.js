import { test, expect } from '@playwright/test'

async function localOnly(page) {
  await page.route('**/*', route => route.request().url().startsWith(process.env.PLAYWRIGHT_BASE_URL) ? route.continue() : route.abort())
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

test('service inquiries, page links, and layouts work across desktop and mobile', async ({ page }) => {
  await localOnly(page)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const links = new Set()
  for (const width of [1440, 1024, 768, 430, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/contact.html', '/how-we-work.html', '/about.html']) {
      await page.goto(path)
      await expect(page.locator('main h1')).toHaveCount(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true)
      const localLinks = await page.locator('a[href]').evaluateAll(anchors => anchors.map(a => a.href).filter(href => href.startsWith(location.origin)))
      localLinks.forEach(link => links.add(link))
      if (path === '/') {
        await expect(page.locator('.hero-title')).toBeInViewport()
        await expect(page.locator('.hero-cta a')).toBeInViewport()
        for (const link of await page.locator('.services .service-next a').all()) {
          await expect(link).toHaveAttribute('href', 'https://calendly.com/jonkwilliams')
          await expect(link).toHaveAttribute('data-service', /^(customer-support|reporting|executive-operations|technical-fixes)$/)
        }
        const screenshot = page.locator('.project-screenshot img')
        await screenshot.scrollIntoViewIfNeeded()
        await expect.poll(() => screenshot.evaluate(img => img.complete && img.naturalWidth === 680 && img.naturalHeight === 367)).toBe(true)
        const projectLink = page.getByRole('link', { name: 'Explore The Eye' })
        await expect(projectLink).toHaveAttribute('href', 'https://eye-of-ao.arweave.net')
        await expect(projectLink).toHaveAttribute('target', '_blank')
        await expect(projectLink).toHaveAttribute('rel', 'noopener noreferrer')
        await expect(page.locator('.project-entry').getByRole('link', { name: 'Tell Us What You Need', exact: true })).toHaveAttribute('href', 'https://calendly.com/jonkwilliams')
      }
      if ([1440, 390].includes(width) && ['/', '/contact.html'].includes(path)) {
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }) })
        await page.screenshot({ path: `audit/restructure-${path === '/' ? 'home' : 'contact'}-${width}.png`, fullPage: true })
      }
    }
  }
  for (const link of links) {
    const url = new URL(link)
    if (url.hash) continue
    const response = await page.request.get(link)
    expect(response.ok(), link).toBe(true)
  }
  expect(errors).toEqual([])
})

test('skip link and mobile navigation are usable from a keyboard', async ({ page }) => {
  await localOnly(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  const toggle = page.getByRole('button', { name: 'Toggle navigation' })
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.locator('#nav-links').getByRole('link', { name: 'About', exact: true }).click()
  await expect(page).toHaveURL(/about\.html$/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})
