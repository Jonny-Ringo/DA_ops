export const APP_NAME = 'DA-Operations-Analytics'
export const SITE_ID = 'dao-academy'
export const VERSION = '1'
export const UPLOAD_URL = 'https://up.arweave.net/tx'
export const QUERY_URLS = ['https://arweave.net/graphql', 'https://arweave-search.goldsky.com/graphql']
export const EVENTS = ['session_start', 'page_view', 'cta_click', 'navigation_click', 'outbound_click', 'file_download', 'scroll_depth', 'engaged_visit', 'form_start', 'form_submit', 'form_success', 'form_error']
export const PAGES = ['/', '/about', '/how-we-work', '/contact']
export const KEYS = { session: 'da.analytics.session.v1', queue: 'da.analytics.queue.v1', optout: 'da.analytics.optout', wallet: 'da.analytics.wallet.v1' }

// Canonical page names only: no arbitrary paths, query strings, or fragments.
export function pageName(path) {
  const clean = path.replace(/^\/[\w-]{43}(?=\/|$)/, '').replace(/\/$/, '').replace(/\.html$/, '')
  const page = !clean || clean === '/index' ? '/' : clean
  return PAGES.includes(page) ? page : null
}

export function campaignValue(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value) ? value.toLowerCase() : ''
}

export function attribution(href, referrer) {
  const url = new URL(href)
  let source = 'direct'
  try {
    const ref = new URL(referrer)
    if (ref.origin !== url.origin && /^https?:$/.test(ref.protocol)) source = ref.hostname
  } catch { /* No referrer. */ }
  return {
    source: campaignValue(url.searchParams.get('utm_source')) || source,
    medium: campaignValue(url.searchParams.get('utm_medium')),
    campaign: campaignValue(url.searchParams.get('utm_campaign')),
    content: campaignValue(url.searchParams.get('utm_content')),
  }
}

export function eventTags(event, environment = 'production') {
  const values = {
    'App-Name': APP_NAME, 'Site-ID': SITE_ID, 'Schema-Version': VERSION,
    'Content-Type': 'application/json', Environment: environment,
    'Event-ID': event.id, 'Event-Type': event.type, 'Session-ID': event.session,
    Timestamp: new Date(event.time).toISOString().slice(0, 10), 'Event-Time': String(event.time),
    // Prefix metadata: bare "Device" has protocol meaning to HyperBEAM uploaders.
    'Analytics-Page': event.page, 'Analytics-Source': event.source, 'Analytics-Medium': event.medium, 'Analytics-Campaign': event.campaign,
    'Analytics-Content': event.content, 'Analytics-Device': event.device, 'Analytics-Detail': event.detail,
  }
  return Object.entries(values).filter(([, value]) => value !== '' && value != null).map(([name, value]) => ({ name, value: String(value) }))
}

export function dateRange(days, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Array.from({ length: days }, (_, i) => new Date(end.getTime() - (days - 1 - i) * 86400000).toISOString().slice(0, 10))
}

export function parseEvent(node) {
  const t = Object.fromEntries(node.tags.map(({ name, value }) => [name, value]))
  const time = Number(t['Event-Time'])
  if (t['App-Name'] !== APP_NAME || t['Site-ID'] !== SITE_ID || t.Environment !== 'production' || t['Schema-Version'] !== VERSION || !EVENTS.includes(t['Event-Type']) || !PAGES.includes(t['Analytics-Page']) || !/^[\w-]{16,64}$/.test(t['Event-ID'] || '') || !/^[\w-]{16,64}$/.test(t['Session-ID'] || '') || !Number.isFinite(time) || time < 1 || time > Date.now() + 300000 || new Date(time).toISOString().slice(0, 10) !== t.Timestamp) return null
  const short = value => String(value || '').slice(0, 253)
  return { id: t['Event-ID'], tx: node.id, type: t['Event-Type'], session: t['Session-ID'], time, page: t['Analytics-Page'], source: short(t['Analytics-Source']), medium: short(t['Analytics-Medium']), campaign: short(t['Analytics-Campaign']), content: short(t['Analytics-Content']), device: short(t['Analytics-Device']), detail: short(t['Analytics-Detail']) }
}

export function summarize(events) {
  const views = events.filter(e => e.type === 'page_view')
  const sessions = new Set(events.map(e => e.session)).size
  const converted = new Set(events.filter(e => e.type === 'form_success').map(e => e.session)).size
  return { events: events.length, views: views.length, sessions, inquiries: events.filter(e => e.type === 'form_success').length, ctas: events.filter(e => e.type === 'cta_click').length, engaged: new Set(events.filter(e => e.type === 'engaged_visit').map(e => e.session)).size, conversion: sessions ? (100 * converted / sessions).toFixed(1) : '0.0' }
}

export function csv(events) {
  const fields = ['time', 'type', 'page', 'source', 'medium', 'campaign', 'content', 'device', 'detail', 'session', 'tx']
  const escape = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"'
  return [fields.join(','), ...events.map(e => fields.map(f => escape(f === 'time' ? new Date(e.time).toISOString() : e[f])).join(','))].join('\r\n')
}
