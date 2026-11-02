import { KEYS, csv, dateRange, summarize } from './analytics-core.js'
import { initShareLinkBuilder } from './share-link-builder.js'
import { loadAnalytics } from './cache.js'
import { canPublishCache } from './cache-privacy.js'
import { setOptOut } from './analytics.js'

const $ = id => document.getElementById(id)
let events = [], dates = [], partial = false, loaded = false, controller, chartKey = null, resultKey = null
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
  for (const [label, value] of [['Page views', metrics.views], ['Sessions', metrics.sessions], ['CTA clicks', metrics.ctas], ['Appointment clicks', metrics.bookings], ['Engaged sessions', metrics.engaged], ['Appointment click rate', `${metrics.conversion}%`]]) {
    const card = node('div', null, 'analytics-metric')
    card.append(node('span', label), node('strong', loaded ? (typeof value === 'number' ? number(value) : value) : '-'))
    $('metrics').append(card)
  }
  const views = events.filter(e => e.type === 'page_view')
  renderChart(views)
  rows('pages', counts(views, e => e.page))
  rows('sources', counts(events, e => e.source, true))
  rows('devices', counts(views, e => e.device))
  rows('interactions', counts(events.filter(e => !['page_view', 'session_start'].includes(e.type)), e => e.type.replaceAll('_', ' ')))
  rows('scroll', counts(events.filter(e => e.type === 'scroll_depth'), e => `${e.detail}%`))
  rows('funnel', [['All sessions', metrics.sessions], ...[['Appointment page opened', 'booking_click'], ['Email link clicked', 'email_click'], ['Historical form inquiries', 'form_success']].map(([label, type]) => [label, new Set(events.filter(e => type === 'email_click' ? e.type === 'outbound_click' && e.detail === 'email' : e.type === type).map(e => e.session)).size])])
  const campaigns = new Map()
  for (const event of events.filter(e => e.campaign)) {
    const key = JSON.stringify([event.campaign, event.source, event.medium, event.content])
    if (!campaigns.has(key)) campaigns.set(key, [])
    campaigns.get(key).push(event)
  }
  table('campaigns', ['Group', 'Shared on / type', 'Post label', 'Sessions', 'Views', 'Appointment clicks', 'Click rate'], [...campaigns.values()].sort((a, b) => summarize(b).sessions - summarize(a).sessions).map(group => {
    const first = group[0], summary = summarize(group)
    return [first.campaign, `${first.source} / ${first.medium || 'not set'}`, first.content || '-', summary.sessions, summary.views, summary.bookings, `${summary.conversion}%`]
  }))
  table('activity', ['Time (UTC)', 'Activity', 'Page', 'Source', 'Campaign', 'Detail', 'Record'], [...events].sort((a, b) => b.time - a.time).slice(0, 100).map(e => {
    const link = node('a', e.tx.slice(0, 8) + '…')
    link.href = `https://arweave.net/${encodeURIComponent(e.tx)}`; link.target = '_blank'; link.rel = 'noopener noreferrer'
    return [new Date(e.time).toISOString().replace('T', ' ').slice(0, 19), e.type.replaceAll('_', ' '), e.page, e.source, e.campaign || '-', e.detail || '-', link]
  }))
  $('export').disabled = !events.length
}

function renderChart(views) {
  const daily = new Map(counts(views, e => new Date(e.time).toISOString().slice(0, 10)))
  const values = dates.map(date => [date, daily.get(date) || 0])
  const key = JSON.stringify(values)
  if (key === chartKey) return
  chartKey = key
  const focusDate = document.activeElement?.dataset.date
  const scroll = $('timeline').scrollLeft
  const max = Math.max(1, ...daily.values())
  $('timeline').replaceChildren()
  const tooltip = $('chart-tooltip')
  tooltip.hidden = true
  for (const [date, count] of values) {
    const day = node('button', null, 'analytics-day'), bar = node('span', null, 'analytics-bar')
    day.type = 'button'; day.dataset.date = date
    const label = date + ': ' + count + ' page views'
    day.setAttribute('aria-label', label)
    const show = () => { tooltip.textContent = label; tooltip.hidden = false; day.setAttribute('aria-describedby', 'chart-tooltip') }
    const hide = () => { tooltip.hidden = true; day.removeAttribute('aria-describedby') }
    day.addEventListener('pointerenter', show)
    day.addEventListener('pointerleave', () => { if (document.activeElement !== day) hide() })
    day.addEventListener('focus', show); day.addEventListener('blur', hide); day.addEventListener('click', show)
    day.addEventListener('keydown', event => { if (event.key === 'Escape') { hide(); event.preventDefault() } })
    bar.style.height = count / max * 120 + 'px'
    day.append(node('span', count), bar, node('span', date.slice(5))); $('timeline').append(day)
    if (date === focusDate) day.focus({ preventScroll: true })
  }
  $('timeline').scrollLeft = scroll
  table('daily-totals', ['Date (UTC)', 'Page views'], values)
}

async function load() {
  controller?.abort()
  const current = controller = new AbortController()
  const requestedDates = dateRange(Number($('period').value))
  $('status').className = ''
  $('status').textContent = 'Loading activity and checking cached history...'
  let storage
  try { storage = localStorage } catch { /* Optional cache. */ }
  try {
    await loadAnalytics({
      dates: requestedDates, signal: current.signal, storage,
      locks: navigator.locks, canPublish: canPublishCache,
      onUpdate(snapshot) {
        if (current !== controller || current.signal.aborted) return
        partial = snapshot.partial || snapshot.failed || !snapshot.verified
        if (snapshot.covered > 0 || snapshot.verified) {
          events = snapshot.events; dates = requestedDates; loaded = true
          const key = JSON.stringify([dates, [...events].sort((a, b) => a.id.localeCompare(b.id))])
          if (key !== resultKey) { resultKey = key; render() }
        }
        const completed = ['ready', 'done'].includes(snapshot.stage)
        const parts = [loaded ? number(events.length) + ' events loaded' : 'No traffic totals are available yet.']
        if (snapshot.covered < snapshot.total) parts.push(snapshot.covered + '/' + snapshot.total + ' days loaded')
        if (snapshot.cacheUsed && !snapshot.verified) parts.push('Cached results; checking indexed records')
        if (!completed) parts.push('Loading and checking history...')
        if (snapshot.partial) parts.push('Partial results: query limit reached')
        if (snapshot.failed) parts.push('Some queries failed. Available results are still shown; try Refresh data.')
        if (completed && !snapshot.failed && !snapshot.partial) parts.push('Checked against indexed records')
        if (!snapshot.covered && loaded) parts.push('Previous results are still shown for their original period')
        if (snapshot.published) parts.push(snapshot.published + ' shared snapshots saved')
        if (snapshot.publishFailed) parts.push('Shared cache unavailable; results remain available')
        $('status').textContent = parts.join(' | ')
        $('status').className = snapshot.failed || snapshot.partial ? 'error' : ''
      },
    })
  } catch {
    if (current.signal.aborted) return
    $('status').className = 'error'
    $('status').textContent = 'Could not load analytics. Try Refresh data.' + (loaded ? ' Available results are still shown.' : ' No traffic totals are available yet.')
  }
}
$('refresh').addEventListener('click', () => void load())
$('period').addEventListener('change', () => void load())
window.addEventListener('pagehide', () => controller?.abort())
$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([csv(events)], { type: 'text/csv;charset=utf-8' }))
  const a = node('a'); a.href = url; a.download = `da-analytics-${dates[0]}-${dates.at(-1)}${partial ? '-partial' : ''}.csv`; a.click()
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
