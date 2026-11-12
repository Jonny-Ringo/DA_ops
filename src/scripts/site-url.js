// Promotion links use the main domain. Permanent Arweave snapshots are optional.
const routes = ['', 'about/', 'contact/', 'community-management/', 'discord-community-management-scope/', 'technical-support-escalation/', 'analytics/', 'privacy/']
const publishedPages = typeof __ARWEAVE_PAGES__ !== 'undefined' ? __ARWEAVE_PAGES__ : []

function onManifest(href) {
  const url = new URL(href)
  return (url.hostname === 'arweave.net' || url.hostname.endsWith('.arweave.net')) && /^\/[\w-]{43}(?:\/|$)/.test(url.pathname)
}

// Saved snapshots are immutable and may predate the folder-based layout.
function savedSnapshotPath(route) {
  if (publishedPages.includes(`${route}index.html`)) return route
  const file = route ? `${route.slice(0, -1)}.html` : 'index.html'
  return publishedPages.includes(file) ? file : null
}

export function arweaveBase(href, fallback = typeof __ARWEAVE_MANIFEST__ === 'string' ? __ARWEAVE_MANIFEST__ : '') {
  const current = new URL(href)
  const isArweave = current.hostname === 'arweave.net' || current.hostname.endsWith('.arweave.net')
  const manifest = (isArweave && current.pathname.match(/^\/([\w-]{43})(?:\/|$)/)?.[1]) || fallback
  if (!/^[\w-]{43}$/.test(manifest)) throw new Error('No published Arweave deployment is available')
  return `https://arweave.net/${manifest}/`
}

export function snapshotAvailable(page, href = window.location.href) {
  const route = page.replace(/^\//, '')
  if (!routes.includes(route)) return false
  return onManifest(href) || savedSnapshotPath(route) !== null
}

export function siteUrl(page, href = window.location.href, destination = 'current') {
  const route = page.replace(/^\//, '')
  if (!routes.includes(route)) throw new Error('Unknown site page')
  if (!['current', 'snapshot'].includes(destination)) throw new Error('Unknown link destination')
  if (destination === 'snapshot' && !snapshotAvailable(page, href)) throw new Error('This page is not in the saved snapshot')
  const target = destination === 'snapshot' && !onManifest(href) ? savedSnapshotPath(route) : route
  return new URL(target, destination === 'snapshot' ? arweaveBase(href) : 'https://daops.net/')
}
