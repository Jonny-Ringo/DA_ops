import test from 'node:test'
import assert from 'node:assert/strict'
import { DataItem } from 'arbundles'
import { attribution, pageName, eventTags, parseEvent, summarize, dateRange, csv } from '../src/scripts/analytics-core.js'
import { generateWallet, signEvent } from '../src/scripts/analytics-signing.js'
import { fetchAnalytics } from '../src/scripts/analytics-query.js'
import { arweaveBase, siteUrl } from '../src/scripts/site-url.js'

const event = (overrides = {}) => ({ id: crypto.randomUUID(), session: crypto.randomUUID(), time: Date.now(), type: 'page_view', page: '/', source: 'linkedin', medium: 'social', campaign: 'launch', content: '', device: 'desktop', detail: '', ...overrides })
const transaction = value => ({ id: 'a'.repeat(43), tags: eventTags(value) })

test('canonical pages strip manifest IDs, reject arbitrary paths and never include queries', () => {
  assert.equal(pageName('/index.html'), '/')
  assert.equal(pageName('/' + 'a'.repeat(43) + '/contact.html'), '/contact')
  assert.equal(pageName('/contact/'), '/contact')
  assert.equal(pageName('/contact/index.html'), '/contact')
  assert.equal(pageName('/' + 'a'.repeat(43) + '/contact/'), '/contact')
  for (const page of ['community-management', 'the-eye', 'discord-community-management-scope', 'technical-support-escalation']) {
    assert.equal(pageName('/' + page + '.html'), '/' + page)
    assert.equal(pageName('/' + page + '/'), '/' + page)
    assert.equal(pageName('/' + page + '/index.html'), '/' + page)
    assert.equal(parseEvent(transaction(event({ page: '/' + page }))).page, '/' + page)
  }
  assert.equal(pageName('/private/person@example.com'), null)
  assert.equal(pageName('/analytics.html'), null)
})
test('attribution only accepts campaign labels and referrer hostnames', () => {
  const result = attribution('https://arweave.net/?utm_source=LinkedIn&utm_medium=social&utm_campaign=launch&utm_content=user%40example.com&email=secret', 'https://search.example/path?secret=private')
  assert.deepEqual(result, { source: 'linkedin', medium: 'social', campaign: 'launch', content: '' })
  assert.equal(attribution('https://arweave.net/', 'https://example.org/private?email=secret').source, 'example.org')
  assert.equal(attribution('https://arweave.net/', 'https://arweave.net/about').source, 'direct')
})

test('promotion URLs use the canonical domain and snapshots require an explicit choice', () => {
  const current = 'a'.repeat(43), previous = 'b'.repeat(43)
  assert.equal(arweaveBase(`https://arweave.net/${current}/analytics.html?ignored=1`, previous), `https://arweave.net/${current}/`)
  assert.equal(arweaveBase(`https://sandbox.arweave.net/${current}/analytics`, previous), `https://arweave.net/${current}/`)
  assert.equal(arweaveBase('http://localhost:5173/analytics.html', previous), `https://arweave.net/${previous}/`)
  assert.equal(arweaveBase(`https://unrelated.example/${current}/analytics.html`, previous), `https://arweave.net/${previous}/`)
  assert.equal(siteUrl('/about/', `https://sandbox.arweave.net/${current}/analytics/`).href, 'https://daops.net/about/')
  assert.equal(siteUrl('/', `https://arweave.net/${current}/analytics/`, 'snapshot').href, `https://arweave.net/${current}/`)
  assert.equal(siteUrl('/community-management/', 'http://localhost:5173').href, 'https://daops.net/community-management/')
  assert.equal(siteUrl('/about/', `https://arweave.net/${current}/analytics/`, 'snapshot').href, `https://arweave.net/${current}/about/`)
  for (const oldPage of ['/about.html', '/how-we-work.html', '/the-eye.html']) {
    assert.throws(() => siteUrl(oldPage, 'http://localhost:5173'), /Unknown site page/)
  }
  assert.throws(() => siteUrl('/community-management/', 'http://localhost:5173', 'snapshot'), /not in the saved snapshot/)
  assert.throws(() => siteUrl('/', 'https://daops.net', 'untrusted'), /Unknown link destination/)
  assert.throws(() => arweaveBase('http://localhost:5173/', ''), /No published/)
  assert.throws(() => siteUrl('//unrelated.example/', `https://arweave.net/${current}/`), /Unknown site page/)
})
test('browser ANS-104 item is independently verified by arbundles, with intact tags and payload', async () => {
  const original = event()
  const raw = await signEvent(original, eventTags(original), await generateWallet())
  const item = new DataItem(Buffer.from(raw))
  assert.equal(await item.isValid(), true)
  assert.deepEqual(JSON.parse(item.rawData.toString()), original)
  assert.deepEqual(item.tags, eventTags(original))
  assert.ok(raw.length < 10000)
  const corrupted = Buffer.from(raw); corrupted[corrupted.length - 1] ^= 1
  assert.equal(await new DataItem(corrupted).isValid(), false)
})
test('metrics distinguish appointment clicks from historical inquiries and booked meetings', () => {
  const a = crypto.randomUUID(), b = crypto.randomUUID()
  const events = [event({ session: a }), event({ session: a }), event({ session: b }), event({ session: a, type: 'form_success' }), event({ session: a, type: 'form_success' }), event({ session: b, type: 'form_error' }), event({ session: a, type: 'booking_click' }), event({ session: a, type: 'booking_click' })]
  assert.deepEqual(summarize(events), { bookings: 2, events: 8, views: 3, sessions: 2, inquiries: 2, ctas: 2, engaged: 0, conversion: '50.0' })
})
test('invalid and non-production records are rejected; UTC ranges cross month boundaries', () => {
  const original = event()
  assert.equal(parseEvent(transaction(original)).id, original.id)
  assert.equal(parseEvent({ ...transaction(original), tags: eventTags(original, 'test') }), null)
  assert.equal(parseEvent(transaction(event({ time: Date.now() + 86400000 }))), null)
  assert.equal(parseEvent(transaction(event({ type: 'unknown' }))), null)
  assert.deepEqual(dateRange(3, new Date('2026-10-01T00:01:00Z')), ['2026-09-29', '2026-09-30', '2026-10-01'])
})
test('CSV escapes quotes, newlines and spreadsheet formulas', () => {
  const output = csv([event({ source: '=WEBSERVICE("bad")', campaign: 'one\ntwo' })])
  assert.ok(output.includes('"\'=WEBSERVICE(""bad"")"'))
  assert.ok(output.includes('"one\ntwo"'))
})
test('GraphQL pagination deduplicates event IDs and filters untrusted records', async () => {
  const originalFetch = globalThis.fetch
  const a = event(), b = event()
  const calls = []
  globalThis.fetch = async (url, options) => {
    const { variables } = JSON.parse(options.body); calls.push(variables)
    return { ok: true, json: async () => ({ data: { transactions: { pageInfo: { hasNextPage: !variables.after }, edges: (variables.after ? [a, b, event({ type: 'unknown' })] : [a]).map((value, i) => ({ cursor: variables.after ? `second-${i}` : 'first', node: transaction(value) })) } } }) }
  }
  try {
    const result = await fetchAnalytics(dateRange(1))
    assert.equal(result.events.length, 2)
    assert.equal(calls[1].after, 'first')
    assert.ok(calls[0].tags.some(t => t.name === 'Environment' && t.values[0] === 'production'))
  } finally { globalThis.fetch = originalFetch }
})
test('query fallback restarts pagination; errors never become a false empty result', async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push([url, JSON.parse(options.body).variables.after])
    return { ok: true, json: async () => !url.includes('goldsky') ? { errors: [{ message: 'down' }] } : { data: { transactions: { pageInfo: { hasNextPage: false }, edges: [] } } } }
  }
  try {
    const result = await fetchAnalytics(dateRange(1))
    assert.deepEqual(result.events, [])
    assert.equal(calls.length, 2)
    assert.equal(calls[1][1], null)
    globalThis.fetch = async () => ({ ok: false, status: 503 })
    await assert.rejects(fetchAnalytics(dateRange(1)), /503/)
  } finally { globalThis.fetch = originalFetch }
})
