import { test, expect } from '@playwright/test'

const origin = process.env.PLAYWRIGHT_BASE_URL
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('homepage offers a fixed booking destination without forwarding query values', async ({ page }) => {
  for (const path of ['/', '/?service=reporting', '/?service=private%40example.com']) {
    await page.goto(path)
    await expect(page.locator('form')).toHaveCount(0)
    await expect(page.locator('.page-hero .project-actions a')).toHaveAttribute('href', 'https://calendly.com/jonkwilliams/30min')
    await expect(page.locator('.page-hero a[href^="mailto:"]')).toHaveAttribute('href', 'mailto:jonny@daops.net')
  }
})

test('navigation anchors respect the header, active state, Escape, and keyboard focus', async ({ page }) => {
  for (const width of [360, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/about/')
    const toggle = page.getByRole('button', { name: 'Toggle navigation' })
    await expect(page.locator('.logo span')).toBeVisible()
    await expect(page.locator('.nav-cta')).toBeVisible()
    await toggle.click()
    await page.keyboard.press('Escape')
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await page.locator('#nav-links').getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page).toHaveURL(`${origin}/`)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#nav-links [aria-current]')).toHaveCount(1)
    await expect(page.locator('#nav-links [aria-current]')).toHaveText('Home')
    await expect(page.locator('#nav-links [aria-current]')).toHaveAttribute('aria-current', 'page')
    await toggle.click()
    await page.locator('#nav-links').getByRole('link', { name: 'Services', exact: true }).click()
    await expect(page).toHaveURL(/\/#services$/)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#nav-links [aria-current]')).toHaveText('Services')
    await expect.poll(() => page.locator('#services').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.nav').getBoundingClientRect().bottom)).toBe(true)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('#nav-links a')).toHaveText(['Home', 'Services', 'About'])
  const serviceLink = page.locator('#nav-links').getByRole('link', { name: 'Services', exact: true })
  await serviceLink.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#services')).toBeFocused()
  await expect(serviceLink).toHaveAttribute('aria-current', 'location')
})

test('booking remains usable when scripts are blocked and on a short mobile viewport', async ({ page }) => {
  await page.route('**/assets/*.js', route => route.abort())
  await page.setViewportSize({ width: 390, height: 410 })
  await page.goto('/')
  await expect(page.locator('.page-hero')).toHaveCSS('opacity', '1')
  await page.locator('.page-hero .project-actions a').scrollIntoViewIfNeeded()
  await expect(page.locator('.page-hero .project-actions a')).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
