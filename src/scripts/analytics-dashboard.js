import { KEYS, csv, dateRange, summarize } from './analytics-core.js'
import { initShareLinkBuilder } from './share-link-builder.js'
import { fetchAnalytics } from './analytics-query.js'
import { setOptOut } from './analytics.js'

const $ = id => document.getElementById(id)
let events = [], dates = [], continuation = null, busy = false, loaded = false
const number = n => n.toLocaleString()
const node = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el }
function table(id, headers, rows) {
  const host = $(id)
  host.replaceChildren()
  if (!rows.length) { host.append(node('p', loaded ? 'No activity in this period yet.' : 'No data loaded.', 'analytics-empty')); return }
  const table = node('table'), head = node('thead'), heading = node('tr'), body = node('tbody')
  headers.forEach(label => { const th = node('th', label); th.scope = 'col'; heading.append(th) })
  head.append(heading)
  for (const row of rows) {
    const tr = node('tr')
    row.forEach(value => { const td = node('td'); td.append(value instanceof Node ? value : String(value)); tr.append(td) })
    body.append(tr)
  }
  table.append(head, body); host.append(table)
}
function counts(items, key, unique = false) {
  const groups = new Map()
  items.forEach(event => { const label = key(event) || 'Not set'; if (!groups.has(label)) groups.set(label, []); groups.get(label).push(event) })
  return [...groups].map(([label, values]) => [label, unique ? new Set(values.map(e => e.session)).size : values.length]).sort((a, b) => b[1] - a[1])
}
function rows(id, values) {
  $(id).replaceChildren()
  if (!values.length) $(id).append(node('p', loaded ? 'No activity in this period yet.' : 'No data loaded.', 'analytics-empty'))
  values.forEach(([label, value]) => { const row = node('div', null, 'analytics-row'); row.append(node('span', label), node('strong', number(value))); $(id).append(row) })
}
function render() {
  const metrics = summarize(events)
  $('metrics').replaceChildren()
  for (const [label, value] of [['Page views', metrics.views], ['Sessions', metrics.sessions], ['CTA clicks', metrics.ctas], ['Inquiries sent', metrics.inquiries], ['Engaged sessions', metrics.engaged], ['Inquiry rate', `${metrics.conversion}%`]]) {
    const card = node('div', null, 'analytics-metric')
    card.append(node('span', label), node('strong', loaded ? (typeof value === 'number' ? number(value) : value) : '-'))
    $('metrics').append(card)
  }
  const views = events.filter(e => e.type === 'page_view')
  const daily = new Map(counts(views, e => new Date(e.time).toISOString().slice(0, 10)))
  const max = Math.max(1, ...daily.values())
  $('timeline').replaceChildren()
  for (const date of dates) {
    const count = daily.get(date) || 0, day = node('div', null, 'analytics-day'), bar = node('div', null, 'analytics-bar')
    day.title = `${date}: ${count} page views`; day.setAttribute('aria-label', day.title)
    bar.style.height = `${count / max * 120}px`
    day.append(node('span', count), bar, node('span', date.slice(5))); $('timeline').append(day)
  }
  rows('pages', counts(views, e => e.page))
  rows('sources', counts(events, e => e.source, true))
  rows('devices', counts(views, e => e.device))
  rows('interactions', counts(events.filter(e => !['page_view', 'session_start'].includes(e.type)), e => e.type.replaceAll('_', ' ')))
  rows('scroll', counts(events.filter(e => e.type === 'scroll_depth'), e => `${e.detail}%`))
  rows('funnel', [['All sessions', metrics.sessions], ...[['CTA clicked', 'cta_click'], ['Form started', 'form_start'], ['Send attempted', 'form_submit'], ['Inquiry confirmed', 'form_success']].map(([label, type]) => [label, new Set(events.filter(e => e.type === type).map(e => e.session)).size])])
  const campaigns = new Map()
  for (const event of events.filter(e => e.campaign)) {
    const key = JSON.stringify([event.campaign, event.source, event.medium, event.content])
    if (!campaigns.has(key)) campaigns.set(key, [])
    campaigns.get(key).push(event)
  }
  table('campaigns', ['Group', 'Shared on / type', 'Post label', 'Sessions', 'Views', 'Inquiries', 'Rate'], [...campaigns.values()].sort((a, b) => summarize(b).sessions - summarize(a).sessions).map(group => {
    const first = group[0], summary = summarize(group)
    return [first.campaign, `${first.source} / ${first.medium || 'not set'}`, first.content || '-', summary.sessions, summary.views, summary.inquiries, `${summary.conversion}%`]
  }))
  table('activity', ['Time (UTC)', 'Activity', 'Page', 'Source', 'Campaign', 'Detail', 'Record'], [...events].sort((a, b) => b.time - a.time).slice(0, 100).map(e => {
    const link = node('a', e.tx.slice(0, 8) + '…')
    link.href = `https://arweave.net/${encodeURIComponent(e.tx)}`; link.target = '_blank'; link.rel = 'noopener noreferrer'
    return [new Date(e.time).toISOString().replace('T', ' ').slice(0, 19), e.type.replaceAll('_', ' '), e.page, e.source, e.campaign || '-', e.detail || '-', link]
  }))
  $('export').disabled = !events.length
  $('more').hidden = !continuation
}

async function load(more = false) {
  if (busy) return
  busy = true
  for (const id of ['refresh', 'period', 'more', 'export']) $(id).disabled = true
  $('status').className = ''
  $('status').textContent = 'Loading indexed activity…'
  const requestedDates = more ? dates : dateRange(Number($('period').value))
  try {
    const result = await fetchAnalytics(requestedDates, n => { $('status').textContent = `Reading indexed activity… ${number(n)} records checked` }, more ? continuation : null)
    const merged = new Map((more ? events : []).map(e => [e.id, e]))
    result.events.forEach(e => merged.set(e.id, e))
    events = [...merged.values()]; dates = requestedDates; continuation = result.continuation; loaded = true
    render()
    $('status').textContent = `${number(events.length)} events loaded · Updated ${new Date().toLocaleTimeString()}${continuation ? ' · Partial results: load more below to include remaining records.' : events.length ? '' : ' · No indexed events found. New visits may still be waiting for indexing.'}`
  } catch {
    $('status').className = 'error'
    $('status').textContent = `Couldn’t load analytics from the query service. Try Refresh data.${loaded ? ' Previous results are still shown for their original period.' : ' No traffic totals are available yet.'}`
  } finally {
    busy = false
    for (const id of ['refresh', 'period', 'more']) $(id).disabled = false
    $('export').disabled = !events.length
  }
}
$('refresh').addEventListener('click', () => void load())
$('period').addEventListener('change', () => void load())
$('more').addEventListener('click', () => void load(true))
$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([csv(events)], { type: 'text/csv;charset=utf-8' }))
  const a = node('a'); a.href = url; a.download = `da-analytics-${dates[0]}-${dates.at(-1)}${continuation ? '-partial' : ''}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
try { $('exclude').checked = JSON.parse(localStorage.getItem(KEYS.optout)) === true } catch { /* Optional storage. */ }
if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) { $('exclude').checked = true; $('exclude').disabled = true }
$('exclude').addEventListener('change', () => {
  const success = setOptOut($('exclude').checked)
  if (!success) { $('exclude').checked = false; $('status').textContent = 'Preference could not be saved because browser storage is blocked.' }
})
initShareLinkBuilder()
dates = dateRange(30)
render()
void load()
