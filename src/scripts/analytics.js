import { EVENTS, KEYS, UPLOAD_URL, attribution, eventTags, pageName } from './analytics-core.js'
import { generateWallet, signEvent, toBase64, fromBase64 } from './analytics-signing.js'

const read = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) ?? fallback } catch { return fallback } }
const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)) } catch { /* In-memory tracking still works. */ } }
const remove = (storage, key) => { try { storage.removeItem(key) } catch { /* Storage may be blocked. */ } }
let local, tab
try { local = window.localStorage; tab = window.sessionStorage } catch { /* Optional storage. */ }
const privacySignal = () => navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true
let memoryOptOut = false
const optedOut = () => memoryOptOut || read(local, KEYS.optout, false) === true || privacySignal()
// Development requires an explicit test flag and always writes a separate namespace.
const environment = import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? 'test' : 'production'
const enabled = () => !optedOut() && (environment === 'production' || read(tab, 'da.analytics.test', false)) && !!crypto?.subtle
let session = read(tab, KEYS.session, null)
let queue = read(tab, KEYS.queue, [])
if (!Array.isArray(queue)) queue = []
queue = queue.filter(item => item?.event?.time > Date.now() - 86400000).slice(-100)
let walletPromise, busy = false, retryTimer, failures = 0
const persist = () => write(tab, KEYS.queue, queue)
const page = pageName(location.pathname)

async function wallet() {
  if (!walletPromise) walletPromise = (async () => {
    const stored = read(tab, KEYS.wallet, null)
    if (stored?.jwk && stored.created > Date.now() - 86400000) return stored.jwk
    const jwk = await generateWallet()
    if (enabled()) write(tab, KEYS.wallet, { jwk, created: Date.now() })
    return jwk
  })().catch(error => { walletPromise = null; throw error })
  return walletPromise
}

async function flush() {
  if (busy || !enabled() || !navigator.onLine || !queue.length) return
  busy = true
  clearTimeout(retryTimer)
  try {
    const jwk = await wallet()
    while (queue.length && enabled()) {
      const item = queue[0]
      if (item.event.time < Date.now() - 86400000) { queue.shift(); persist(); continue }
      if (!item.raw) {
        item.raw = toBase64(await signEvent(item.event, eventTags(item.event, environment), jwk))
        persist() // Reuse exactly the same signature on retry, including after navigation.
      }
      if (!enabled()) break
      const response = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: fromBase64(item.raw), keepalive: true, signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error(`Analytics upload: ${response.status}`)
      queue = queue.filter(entry => entry.event.id !== item.event.id)
      persist()
      failures = 0
    }
  } catch {
    failures++
    // Delays are bounded; navigation/online events also retry the persisted queue.
    retryTimer = setTimeout(flush, Math.min(300000, 2000 * 2 ** Math.min(failures, 7)))
  } finally { busy = false }
}

function enqueue(type, detail = '') {
  const event = { id: crypto.randomUUID(), type, session: session.id, time: Date.now(), page, ...session.attribution, device: innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop', detail }
  queue.push({ event })
  queue = queue.slice(-100)
  persist()
}

export function trackEvent(type, detail = '') {
  try {
    if (!enabled() || !page || !EVENTS.includes(type)) return
    const now = Date.now()
    if (!session?.id || now - session.last > 30 * 60 * 1000) {
      session = { id: crypto.randomUUID(), last: now, attribution: attribution(location.href, document.referrer) }
      enqueue('session_start')
    }
    session.last = now
    write(tab, KEYS.session, session)
    // Only static labels are accepted. Never pass input values or error messages.
    enqueue(type, /^[a-z0-9_/.:-]{0,80}$/i.test(detail) ? detail : '')
    void flush()
  } catch { /* Analytics must never interrupt navigation or form submission. */ }
}

export function setOptOut(value) {
  memoryOptOut = value
  write(local, KEYS.optout, value)
  if (value) {
    queue = []; session = null; walletPromise = null
    clearTimeout(retryTimer)
    for (const key of [KEYS.queue, KEYS.session, KEYS.wallet]) remove(tab, key)
  }
  return read(local, KEYS.optout, false) === value
}

export function initAnalytics() {
  const control = document.querySelector('[data-analytics-preference]')
  if (control) {
    const render = () => { control.textContent = optedOut() ? 'Analytics off in this browser' : 'Turn off analytics in this browser'; control.disabled = privacySignal() }
    render()
    control.addEventListener('click', () => {
      const saved = setOptOut(!optedOut())
      render()
      if (!saved) control.textContent = 'Preference applies to this page only; browser storage is unavailable'
    })
  }
  if (!page) return // Dashboard and privacy visits never count as traffic.
  trackEvent('page_view')
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]')
    if (!link) return
    const target = new URL(link.href)
    if (link.hasAttribute('download')) trackEvent('file_download', 'resource')
    else if (target.origin !== location.origin) {
      if (['https:', 'http:', 'mailto:', 'tel:'].includes(target.protocol)) trackEvent('outbound_click', target.protocol === 'mailto:' ? 'email' : target.protocol === 'tel:' ? 'phone' : 'external')
    } else if (link.matches('.btn, .nav-cta')) trackEvent('cta_click', pageName(target.pathname) || 'section')
    else if (pageName(target.pathname)) trackEvent('navigation_click', pageName(target.pathname))
  })
  const depths = new Set()
  window.addEventListener('scroll', () => {
    const height = document.documentElement.scrollHeight - innerHeight
    if (height < 100) return
    const depth = Math.min(100, Math.round(scrollY / height * 100))
    for (const mark of [25, 50, 75, 100]) if (depth >= mark && !depths.has(mark)) { depths.add(mark); trackEvent('scroll_depth', String(mark)) }
  }, { passive: true })
  let activeSeconds = 0
  const engagement = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    activeSeconds++
    if (activeSeconds === 15) { trackEvent('engaged_visit', '15_seconds'); clearInterval(engagement) }
  }, 1000)
  window.addEventListener('online', () => void flush())
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      // The previous page may have drained the tab queue while this page was cached.
      const savedQueue = read(tab, KEYS.queue, queue)
      if (Array.isArray(savedQueue)) queue = savedQueue
      session = read(tab, KEYS.session, session)
      trackEvent('page_view')
    }
    void flush()
  })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { persist(); void flush() } })
  window.addEventListener('storage', event => { if (event.key === KEYS.optout && optedOut()) setOptOut(true) })
}
