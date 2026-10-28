import { test, expect } from '@playwright/test'

async function localOnly(page) {
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173') ? route.continue() : route.abort())
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
          const service = new URL(await link.getAttribute('href'), page.url()).searchParams.get('service')
          await link.click()
          await expect(page).toHaveURL(/contact\.html\?service=/)
          await expect(page.getByLabel('Service (optional)')).toHaveValue(service)
          await expect(page.getByLabel('What do you need help with?')).toBeVisible()
          await page.goBack()
        }
        const screenshot = page.locator('.project-screenshot img')
        await screenshot.scrollIntoViewIfNeeded()
        await expect.poll(() => screenshot.evaluate(img => img.complete && img.naturalWidth === 680 && img.naturalHeight === 367)).toBe(true)
        const projectLink = page.getByRole('link', { name: 'Explore The Eye' })
        await expect(projectLink).toHaveAttribute('href', 'https://eye-of-ao.arweave.net')
        await expect(projectLink).toHaveAttribute('target', '_blank')
        await expect(projectLink).toHaveAttribute('rel', 'noopener noreferrer')
        await page.locator('.project-entry').getByRole('link', { name: 'Tell Us What You Need', exact: true }).click()
        await expect(page).toHaveURL(/contact\.html\?service=technical-fixes$/)
        await expect(page.getByLabel('Service (optional)')).toHaveValue('technical-fixes')
        await page.goBack()
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
  await page.locator('#nav-links').getByRole('link', { name: 'Contact', exact: true }).click()
  await expect(page).toHaveURL(/contact\.html$/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('a project inquiry needs only name, email, and the problem; optional company reaches the existing endpoint', async ({ page }) => {
  await localOnly(page)
  const submissions = []
  await page.route('https://formspree.io/f/xbgldgal', route => {
    submissions.push(route.request().postData())
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await page.goto('/contact.html')
  await expect(page.locator('form input:visible, form textarea:visible, form select:visible')).toHaveCount(5)
  await page.getByRole('button', { name: 'Send to DA' }).click()
  expect(submissions).toHaveLength(0)
  await page.getByLabel('Name', { exact: false }).fill('Test Person')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('not-an-email')
  await page.getByLabel('What do you need help with?').fill('An API integration needs attention.')
  await page.getByRole('button', { name: 'Send to DA' }).click()
  expect(submissions).toHaveLength(0)
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('test@example.com')
  await page.getByRole('button', { name: 'Send to DA' }).click()
  await expect(page.locator('#contact-status')).toContainText('message has been sent')
  expect(submissions).toHaveLength(1)
  expect(submissions[0]).toContain('An API integration needs attention.')
  await expect(page.locator('#message')).toHaveValue('')
  await page.locator('#name').fill('Test Person')
  await page.locator('#email').fill('test@example.com')
  await page.locator('#company').fill('Optional project')
  await page.locator('#message').fill('Please review our support workflow.')
  await page.getByRole('button', { name: 'Send to DA' }).click()
  await expect(page.locator('#contact-status')).toContainText('message has been sent')
  expect(submissions).toHaveLength(2)
  expect(submissions[1]).toContain('Optional project')
})

test('honeypot entries cannot send an inquiry', async ({ page }) => {
  await localOnly(page)
  let submitted = false
  await page.route('https://formspree.io/**', route => { submitted = true; return route.fulfill({ status: 200, body: '{}' }) })
  await page.goto('/contact.html')
  await page.locator('#name').fill('Test Person')
  await page.locator('#email').fill('test@example.com')
  await page.locator('#message').fill('Spam example')
  await page.locator('[name="_gotcha"]').evaluate(input => { input.value = 'bot-filled' })
  await page.getByRole('button', { name: 'Send to DA' }).click()
  expect(submitted).toBe(false)
  await expect(page.locator('#contact-status')).toBeEmpty()
})
