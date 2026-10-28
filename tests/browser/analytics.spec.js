import { test, expect } from '@playwright/test'
import { DataItem } from 'arbundles'
import { eventTags } from '../../src/scripts/analytics-core.js'
import { readFileSync } from 'node:fs'
const publishedUrl = JSON.parse(readFileSync(new URL('../../.deployments/latest.json', import.meta.url), 'utf8')).url

async function setup(page, options = {}) {
  const events = [], errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(({ optout, testMode, dnt, deniedStorage }) => {
    if (testMode !== false) sessionStorage.setItem('da.analytics.test', 'true')
    if (optout) localStorage.setItem('da.analytics.optout', 'true')
    if (dnt) Object.defineProperty(navigator, 'doNotTrack', { value: '1' })
    if (deniedStorage) { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Denied') } }); Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Denied') } }) }
  }, options)
  await page.route('**/*', async route => {
    const url = route.request().url()
    if (url.startsWith('http://127.0.0.1:4173')) return route.continue()
    if (url === 'https://up.arweave.net/tx') {
      const item = new DataItem(route.request().postDataBuffer())
      expect(await item.isValid()).toBe(true)
      expect(item.tags.find(t => t.name === 'Environment').value).toBe('test')
      events.push(JSON.parse(item.rawData.toString()))
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }
    return route.abort()
  })
  return { events, errors }
}

test('visits, campaigns, CTA clicks and contact success survive navigation without form data', async ({ page }) => {
  const { events, errors } = await setup(page)
  await page.route('https://formspree.io/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }))
  await page.goto('/?utm_source=linkedin&utm_medium=social&utm_campaign=launch&email=private')
  await expect.poll(() => events.filter(e => e.type === 'page_view').length).toBe(1)
  await page.locator('.featured-project').getByRole('link', { name: 'Discuss a Reporting Project' }).click()
  await expect(page).toHaveURL(/contact\.html\?service=reporting$/)
  await page.locator('#name').fill('Private Person')
  await page.locator('#company').fill('Private Company')
  await page.locator('#email').fill('private@example.com')
  await page.locator('#message').fill('Never put this in analytics')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('#contact-status')).toContainText('message has been sent')
  await expect.poll(() => events.filter(e => e.type === 'form_success').length).toBe(1)
  expect(events.filter(e => e.type === 'session_start')).toHaveLength(1)
  expect(events.some(e => e.type === 'cta_click')).toBe(true)
  for (const type of ['cta_click', 'form_start', 'form_submit', 'form_success']) {
    // Navigation may retry the same signed event; count logical events by ID.
    expect(new Set(events.filter(e => e.type === type).map(e => e.id)).size).toBe(1)
    expect(events.find(e => e.type === type).detail).toBe('service:reporting')
  }
  expect(new Set(events.map(e => e.session)).size).toBe(1)
  expect(events.every(e => e.campaign === 'launch')).toBe(true)
  expect(JSON.stringify(events)).not.toMatch(/Private|private@|Never put|email=/)
  expect(errors).toEqual([])
})

test('invalid forms never submit, and failures are not counted as inquiries', async ({ page }) => {
  const { events } = await setup(page)
  let requests = 0
  await page.route('https://formspree.io/**', route => { requests++; return route.fulfill({ status: 503 }) })
  await page.goto('/contact.html')
  await page.locator('button[type=submit]').click()
  expect(requests).toBe(0)
  await page.locator('#name').fill('Test')
  await page.locator('#company').fill('Test')
  await page.locator('#email').fill('test@example.com')
  await page.locator('#message').fill('Please help with a broken workflow')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('#contact-status')).toContainText('could not accept')
  await expect.poll(() => events.some(e => e.type === 'form_error' && e.detail === 'provider_http_503')).toBe(true)
  expect(events.some(e => e.type === 'form_success')).toBe(false)
  await expect(page.locator('#name')).toHaveValue('Test')
})

for (const mode of ['rate_limit', 'network', 'timeout']) {
  test(`contact ${mode} failures preserve inputs and record a safe diagnostic`, async ({ page }) => {
    const { events } = await setup(page)
    const detail = { rate_limit: 'provider_http_429', network: 'connection_unconfirmed', timeout: 'delivery_timeout' }[mode]
    if (mode === 'timeout') {
      await page.addInitScript(() => {
        const originalFetch = window.fetch
        window.fetch = (input, options) => String(input).startsWith('https://formspree.io/')
          ? Promise.reject(new DOMException('Private provider error', 'TimeoutError'))
          : originalFetch(input, options)
      })
    } else {
      await page.route('https://formspree.io/**', route => mode === 'rate_limit'
        ? route.fulfill({ status: 429, body: 'Private provider error' }) : route.abort('failed'))
    }
    await page.goto('/contact.html')
    await page.locator('#name').fill('Private Person')
    await page.locator('#company').fill('Private Company')
    await page.locator('#email').fill('private@example.com')
    await page.locator('#message').fill('Private message')
    await page.locator('button[type=submit]').click()
    await expect.poll(() => events.some(e => e.type === 'form_error' && e.detail === detail)).toBe(true)
    await expect(page.locator('#contact-status')).toContainText('entries are still here')
    await expect(page.locator('#message')).toHaveValue('Private message')
    await expect(page.locator('button[type=submit]')).toBeEnabled()
    expect(events.some(e => e.type === 'form_success')).toBe(false)
    expect(JSON.stringify(events)).not.toMatch(/Private|private@/)
  })
}

test('queued signed events retry identically after a failed upload and reload', async ({ page }) => {
  const { events } = await setup(page)
  let firstRaw
  await page.route('https://up.arweave.net/tx', route => { firstRaw ||= route.request().postDataBuffer().toString('base64'); return route.fulfill({ status: 503 }) })
  await page.goto('/')
  await expect.poll(() => !!firstRaw).toBe(true)
  const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem('da.analytics.queue.v1'))[0])
  await page.unroute('https://up.arweave.net/tx')
  await page.reload()
  await expect.poll(() => events.some(e => e.id === before.event.id)).toBe(true)
  expect(before.raw).toBe(firstRaw)
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('da.analytics.queue.v1')).length)).toBe(0)
})

for (const scenario of [{ optout: true }, { dnt: true }, { testMode: false }, { deniedStorage: true }]) {
  test(`privacy/local-preview controls are respected: ${JSON.stringify(scenario)}`, async ({ page }) => {
    const { events, errors } = await setup(page, scenario)
    await page.goto('/contact.html')
    await page.waitForTimeout(300)
    expect(events).toHaveLength(0)
    expect(errors).toEqual([])
    await expect(page.locator('button[type=submit]')).toBeEnabled()
  })
}

test('dashboard renders indexed traffic safely, builds promotion links and fits mobile', async ({ page }) => {
  const { events, errors } = await setup(page)
  const session = crypto.randomUUID()
  const records = ['page_view', 'cta_click', 'form_success'].map(type => ({ id: crypto.randomUUID(), session, time: Date.now(), type, page: '/', source: '<img src=x onerror=alert(1)>', campaign: 'launch', medium: 'social', content: '', detail: '', device: 'desktop' }))
  await page.route('**/graphql', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { transactions: { pageInfo: { hasNextPage: false }, edges: records.map(e => ({ cursor: e.id, node: { id: 'a'.repeat(43), tags: eventTags(e) } })) } } }) }))
  await page.goto('/analytics.html')
  await expect(page.locator('#status')).toContainText('3 events loaded')
  await expect(page.locator('#metrics')).toContainText('100.0%')
  expect(await page.locator('#sources img').count()).toBe(0)
  await page.locator('#source').fill('linkedin')
  await page.locator('#campaign').fill('october_launch')
  await page.getByRole('button', { name: 'Create link' }).click()
  await expect(page.locator('#campaign-url')).toHaveValue(`${publishedUrl}?utm_source=linkedin&utm_medium=social&utm_campaign=october_launch`)
  await page.locator('#exclude').check()
  expect(await page.evaluate(() => localStorage.getItem('da.analytics.optout'))).toBe('true')
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    if (width !== 320) await page.screenshot({ path: `audit/analytics-${width}.png`, fullPage: true })
  }
  expect(events).toHaveLength(0)
  expect(errors).toEqual([])
})

test('dashboard distinguishes service failure from zero traffic', async ({ page }) => {
  await setup(page)
  await page.route('**/graphql', route => route.fulfill({ status: 503 }))
  await page.goto('/analytics.html')
  await expect(page.locator('#status')).toContainText('Couldn’t load analytics')
  await expect(page.locator('#metrics strong').first()).toHaveText('-')
  await expect(page.locator('#export')).toBeDisabled()
})

test('share links accept the screenshot phrases and preserve every supplied label', async ({ page }) => {
  await setup(page)
  await page.goto('/analytics.html')
  await expect(page.locator('.campaign-options')).not.toHaveAttribute('open')
  await page.locator('#landing').selectOption('/about.html')
  await page.locator('#source').fill('X')
  await page.locator('#campaign').fill('October Spooky Vibes')
  await page.getByText('More options (optional)', { exact: true }).click()
  await page.locator('#medium').selectOption('social')
  await page.locator('#content').fill('Does your community need support')
  await page.getByRole('button', { name: 'Create link', exact: true }).click()
  await expect(page.locator('#campaign-url')).toHaveValue(`${publishedUrl}about.html?utm_source=x&utm_medium=social&utm_campaign=october_spooky_vibes&utm_content=does_your_community_need_support`)
  await expect(page.locator('#campaign-summary')).toContainText('october_spooky_vibes')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy link', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.locator('#campaign-url').inputValue())
  await page.locator('#campaign').fill('New group')
  await expect(page.locator('.campaign-result')).toBeHidden()
  await page.getByRole('button', { name: 'Create link', exact: true }).click()
  await expect(page.locator('#campaign-url')).toHaveValue(/utm_campaign=new_group/)
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.locator('#share-link-panel').screenshot({ path: `audit/share-link-${width}.png` })
  }
})

test('share links work with only a source and reject unusable labels without stale links', async ({ page }) => {
  await setup(page)
  await page.goto('/analytics.html')
  await page.locator('#source').fill('Email')
  await page.getByRole('button', { name: 'Create link', exact: true }).click()
  await expect(page.locator('#campaign-url')).toHaveValue(`${publishedUrl}?utm_source=email&utm_medium=email`)
  await page.locator('#campaign').fill('!!!')
  await page.getByRole('button', { name: 'Create link', exact: true }).click()
  await expect(page.locator('.campaign-result')).toBeHidden()
  expect(await page.locator('#campaign').evaluate(el => el.validationMessage)).toContain('Include at least one letter')
  await page.locator('#campaign').fill('October launch')
  await page.getByRole('button', { name: 'Create link', exact: true }).click()
  await expect(page.locator('#campaign-url')).toHaveValue(/utm_campaign=october_launch/)
})

test('all content pages track, scroll and engagement record, privacy page does not track', async ({ page }) => {
  const { events, errors } = await setup(page)
  for (const path of ['/about.html', '/how-we-work.html']) {
    await page.goto(path)
    await expect.poll(() => events.some(e => e.type === 'page_view' && e.page === path.replace('.html', ''))).toBe(true)
  }
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect.poll(() => events.some(e => e.type === 'scroll_depth' && e.detail === '100')).toBe(true)
  await expect.poll(() => events.some(e => e.type === 'engaged_visit'), { timeout: 20000 }).toBe(true)
  await page.goto('/privacy.html')
  expect(events.some(e => e.page === '/privacy')).toBe(false)
  await page.locator('[data-analytics-preference]').click()
  await expect(page.locator('[data-analytics-preference]')).toHaveText('Analytics off in this browser')
  expect(await page.evaluate(() => sessionStorage.getItem('da.analytics.queue.v1'))).toBe(null)
  expect(errors).toEqual([])
})
