import { test, expect } from '@playwright/test'

const origin = process.env.PLAYWRIGHT_BASE_URL
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('old contact URLs offer a fixed booking destination without forwarding query values', async ({ page }) => {
  for (const path of ['/contact.html', '/contact.html?service=reporting', '/contact.html?service=private%40example.com']) {
    await page.goto(path)
    await expect(page.locator('form')).toHaveCount(0)
    await expect(page.locator('.booking-link')).toHaveAttribute('href', 'https://calendly.com/jonkwilliams')
  }
})

test('email fallback opens an email client and clipboard copying reports success and failure', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/contact.html')
  await expect(page.locator('.contact-email > a')).toHaveAttribute('href', 'mailto:d.academy.operations@gmail.com')
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true)
  await page.getByRole('button', { name: 'Copy email address' }).click()
  await expect(page.locator('.copy-email-tooltip')).toHaveText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('d.academy.operations@gmail.com')
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('Clipboard unavailable')) })
  await page.getByRole('button', { name: 'Copy email address' }).click()
  await expect(page.locator('.copy-email-tooltip')).toContainText('copy it manually')
})

test('navigation anchors respect the header, active state, Escape, and keyboard focus', async ({ page }) => {
  for (const width of [360, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/about.html')
    const toggle = page.getByRole('button', { name: 'Toggle navigation' })
    await expect(page.locator('.logo span')).toBeVisible()
    await expect(page.locator('.nav-cta')).toBeVisible()
    await toggle.click()
    await page.keyboard.press('Escape')
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await page.locator('#nav-links').getByRole('link', { name: 'Work', exact: true }).click()
    await expect(page).toHaveURL(/\/#work$/)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#nav-links [aria-current]')).toHaveCount(1)
    await expect(page.locator('#nav-links [aria-current]')).toHaveText('Work')
    await expect.poll(() => page.locator('#work').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.nav').getBoundingClientRect().bottom)).toBe(true)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  const serviceLink = page.locator('#nav-links').getByRole('link', { name: 'Services', exact: true })
  await serviceLink.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#services')).toBeFocused()
  await expect(serviceLink).toHaveAttribute('aria-current', 'location')
})

test('booking remains usable when scripts are blocked and on a short mobile viewport', async ({ page }) => {
  await page.route('**/assets/*.js', route => route.abort())
  await page.setViewportSize({ width: 390, height: 410 })
  await page.goto('/contact.html')
  await expect(page.locator('.contact-grid')).toHaveCSS('opacity', '1')
  await page.locator('.booking-link').scrollIntoViewIfNeeded()
  await expect(page.locator('.booking-link')).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
