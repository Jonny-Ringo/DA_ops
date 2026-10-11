// Optional integration check: one synthetic event, always excluded from production totals.
import fs from 'node:fs/promises'
import { generateWallet, signEvent } from '../src/scripts/analytics-signing.js'
import { UPLOAD_URL, QUERY_URLS, eventTags, APP_NAME, SITE_ID } from '../src/scripts/analytics-core.js'
import { createHash } from 'node:crypto'

const report = { checkedAt: new Date().toISOString(), queries: [] }
if (process.argv.includes('--verify-index')) {
  const previous = JSON.parse(await fs.readFile(new URL('../audit/analytics-live-check.json', import.meta.url), 'utf8'))
  report.upload = previous.upload
  report.indexing = []
  for (const endpoint of QUERY_URLS) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'query($ids:[ID!]) { transactions(ids:$ids) { edges { node { id tags { name value } } } } }', variables: { ids: [previous.upload.tx] } }), signal: AbortSignal.timeout(20000) })
    const body = await response.json()
    report.indexing.push({ endpoint, status: response.status, indexed: !!body.data?.transactions?.edges?.length, tags: body.data?.transactions?.edges?.[0]?.node?.tags })
  }
}
for (const endpoint of QUERY_URLS) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'query($tags:[TagFilter!]) { transactions(tags:$tags,first:1) { edges { node { id } } } }', variables: { tags: [{ name: 'App-Name', values: [APP_NAME] }, { name: 'Site-ID', values: [SITE_ID] }, { name: 'Environment', values: ['production'] }] } }), signal: AbortSignal.timeout(20000) })
  const body = await response.json()
  report.queries.push({ endpoint, status: response.status, valid: Array.isArray(body.data?.transactions?.edges) && !body.errors })
}
if (process.argv.includes('--upload-test')) {
  const event = { id: crypto.randomUUID(), session: crypto.randomUUID(), time: Date.now(), type: 'page_view', page: '/', source: 'integration_test', medium: '', campaign: '', content: '', device: 'desktop', detail: '' }
  const raw = await signEvent(event, eventTags(event, 'test'), await generateWallet())
  const tx = createHash('sha256').update(raw.subarray(2, 514)).digest('base64url')
  const response = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: raw, signal: AbortSignal.timeout(30000) })
  const responseText = await response.text()
  let receipt
  try { receipt = JSON.parse(responseText) } catch { /* Report non-JSON errors below. */ }
  report.upload = { status: response.status, accepted: response.ok, tx, environment: 'test', bytes: raw.length, bundleId: receipt?.['bundle-id'], bundleStatus: receipt?.['bundle-status'], error: response.ok ? undefined : responseText.slice(0, 200) }
}
await fs.writeFile(new URL('../audit/analytics-live-check.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
if (!report.queries.some(result => result.valid) || (report.upload && !report.upload.accepted)) process.exitCode = 1
