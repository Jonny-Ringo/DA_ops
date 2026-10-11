import { test, expect } from '@playwright/test'

async function openHome(page) {
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173') ? route.continue() : route.abort())
  await page.goto('/')
}

test('project strip scrolls continuously across desktop and mobile', async ({ page }) => {
  await openHome(page)
  const strip = page.locator('.project-strip')
  const track = page.locator('.project-strip-track')
  await expect(page.locator('.hero + .project-strip + .problem')).toHaveCount(1)
  await expect(page.locator('.project-logo-group:not([aria-hidden]) > li')).toHaveCount(6)
  await expect(strip.locator('button, .project-strip-heading, img[alt="Apple"], img[alt="Intel"]')).toHaveCount(0)
  await expect(page.locator('.project-logo-group[aria-hidden="true"]')).toHaveCount(1)
  const isPaused = () => track.evaluate(el => getComputedStyle(el).animationPlayState)
  expect(await isPaused()).toBe('running')
  await page.locator('.project-strip-viewport').hover()
  expect(await isPaused()).toBe('running')
  await page.mouse.move(0, 0)
  await page.locator('.project-strip-viewport').focus()
  expect(await isPaused()).toBe('running')
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => strip.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    const rect = await strip.boundingBox()
    expect(rect.width).toBe(width)
    const viewport = await page.locator('.project-strip-viewport').boundingBox()
    expect(viewport.x).toBe(0)
    expect(viewport.width).toBe(width)
    expect(rect.height).toBeLessThan(140)
    const groups = await page.locator('.project-logo-group').evaluateAll(items => items.map(el => el.getBoundingClientRect().width))
    expect(groups[0]).toBeCloseTo(groups[1], 1)
    if (width !== 320) {
      await page.evaluate(() => window.scrollTo({ top: document.querySelector('.hero').offsetHeight - 520, behavior: 'instant' }))
      await page.screenshot({ path: `audit/project-strip-${width}.png` })
    }
  }
})

test('profile links work in both halves of the scrolling loop', async ({ page, context }) => {
  await context.route('https://x.com/**', route => route.fulfill({ body: '<title>Profile</title>', contentType: 'text/html' }))
  await page.setViewportSize({ width: 1440, height: 900 })
  await openHome(page)
  const groups = page.locator('.project-logo-group')
  const profiles = ['arweaveeco', 'aothecomputer', 'Polkadot', 'decentdao', 'fwdresearch', 'sarcophagusio']
  for (let half = 0; half < 2; half++) {
    const links = groups.nth(half).locator('a')
    await expect(links).toHaveCount(profiles.length)
    for (let i = 0; i < profiles.length; i++) {
      await expect(links.nth(i)).toHaveAttribute('href', `https://x.com/${profiles[i]}`)
      await expect(links.nth(i)).toHaveAttribute('target', '_blank')
      if (half) await expect(links.nth(i)).toHaveAttribute('tabindex', '-1')
    }
    // Sample each half without waiting for a full animation cycle.
    await page.locator('.project-strip-track').evaluate((el, half) => {
      const animation = el.getAnimations()[0]
      animation.pause()
      animation.currentTime = half ? Number(animation.effect.getTiming().duration) - 1 : 0
    }, half)
    const popupPromise = page.waitForEvent('popup')
    await links.first().click()
    const popup = await popupPromise
    await expect(popup).toHaveURL('https://x.com/arweaveeco')
    await popup.close()
  }
})

test('reduced motion shows one scrollable list without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 900 })
  await openHome(page)
  expect(await page.locator('.project-strip-track').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  await expect(page.locator('.project-logo-group[aria-hidden]')).toBeHidden()
  const scroll = await page.locator('.project-strip-viewport').evaluate(el => { el.scrollLeft = 500; return el.scrollLeft })
  expect(scroll).toBeGreaterThan(0)
})
