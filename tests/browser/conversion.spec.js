import { test, expect } from '@playwright/test'

const origin = 'http://127.0.0.1:4173'
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('service context is editable, unknown values stay neutral, and the showcase routes reporting inquiries', async ({ page }) => {
  for (const path of ['/contact.html', '/contact.html?service=unknown', '/contact.html?service=private%40example.com']) {
    await page.goto(path)
    await expect(page.getByLabel('Service (optional)')).toHaveValue('')
  }
  await page.goto('/')
  await page.locator('.featured-project').getByRole('link', { name: 'Discuss a Reporting Project' }).click()
  await expect(page.getByLabel('Service (optional)')).toHaveValue('reporting')
  await page.getByLabel('Service (optional)').selectOption('customer-support')
  await expect(page.getByLabel('Service (optional)')).toHaveValue('customer-support')
  await page.getByLabel('Service (optional)').selectOption('')
  await expect(page.getByLabel('Service (optional)')).toHaveValue('')
})

test('an inquiry preserves its draft and service after failure, prevents duplicate sends, and retries successfully', async ({ page }) => {
  const submissions = []
  let completeRequest
  await page.route('https://formspree.io/f/xbgldgal', async route => {
    submissions.push(route.request().postData())
    if (submissions.length === 1) await new Promise(resolve => { completeRequest = resolve })
    return route.fulfill({ status: submissions.length === 1 ? 503 : 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await page.goto('/contact.html?service=reporting')
  await page.locator('#name').fill('Website Test')
  await page.locator('#email').fill('test@example.com')
  await page.locator('#company').fill('Test Company')
  await page.locator('#message').fill('A reporting inquiry used only in a mocked test.')
  await page.getByRole('button', { name: 'Send to DA' }).click()
  await expect.poll(() => submissions.length).toBe(1)
  await expect(page.locator('#contact-status')).toContainText('Sending')
  await expect(page.getByRole('button', { name: 'Send to DA' })).toBeDisabled()
  await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit() })
  expect(submissions).toHaveLength(1)
  completeRequest()
  await expect(page.locator('#contact-status')).toContainText('entries are still here')
  await expect(page.locator('#service')).toHaveValue('reporting')
  await expect(page.locator('#company')).toHaveValue('Test Company')
  await expect(page.locator('#message')).toHaveValue('A reporting inquiry used only in a mocked test.')
  await page.locator('#service').selectOption('managed-operations')
  await page.getByRole('button', { name: 'Send to DA' }).click()
  await expect(page.locator('#contact-status')).toContainText('usually reply by email within one business day')
  expect(submissions).toHaveLength(2)
  expect(submissions[0]).toMatch(/name="service"\r?\n\r?\nreporting/)
  expect(submissions[1]).toMatch(/name="service"\r?\n\r?\nmanaged-operations/)
  await expect(page.locator('#message')).toHaveValue('')
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

test('the screenshot opens at its original size from a keyboard on desktop and mobile', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    const link = page.getByRole('link', { name: 'View The Eye screenshot at full size' })
    await link.focus()
    const opened = page.waitForEvent('popup')
    await page.keyboard.press('Enter')
    const popup = await opened
    await popup.waitForLoadState()
    await expect.poll(() => popup.locator('img').evaluate(img => img.naturalWidth)).toBe(680)
    expect(new URL(popup.url()).pathname).toMatch(/the-eye.*\.png$/)
    await popup.close()
  }
})

test('critical form content stays visible when initialization is delayed and fits a shortened mobile viewport', async ({ page }) => {
  let releaseScripts
  const scriptsReady = new Promise(resolve => { releaseScripts = resolve })
  await page.route('**/assets/*.js', async route => { await scriptsReady; await route.continue() })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/contact.html?service=reporting', { waitUntil: 'commit' })
  await expect(page.locator('.contact-grid')).toHaveCSS('opacity', '1')
  await expect(page.locator('.form-offer')).toBeVisible()
  releaseScripts()
  await expect(page.locator('#service')).toHaveValue('reporting')
  await page.setViewportSize({ width: 390, height: 410 })
  for (const [id, value] of [['name', 'Test'], ['email', 'test@example.com'], ['company', 'Example'], ['message', 'Mobile viewport test']]) {
    const field = page.locator(`#${id}`)
    await field.fill(value)
    await expect(field).toBeFocused()
    await expect(field).toBeInViewport()
    expect(await field.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
