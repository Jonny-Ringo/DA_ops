// Shared promotion links use Arweave: the current manifest on Arweave itself,
// or the last published manifest on other hosts. SEO metadata is built separately.
export function arweaveBase(href, fallback = typeof __ARWEAVE_MANIFEST__ === 'string' ? __ARWEAVE_MANIFEST__ : '') {
  const current = new URL(href)
  const isArweave = current.hostname === 'arweave.net' || current.hostname.endsWith('.arweave.net')
  const manifest = (isArweave && current.pathname.match(/^\/([\w-]{43})(?:\/|$)/)?.[1]) || fallback
  if (!/^[\w-]{43}$/.test(manifest)) throw new Error('No published Arweave deployment is available')
  return `https://arweave.net/${manifest}/`
}

export function siteUrl(page, href = window.location.href) {
  const route = page.replace(/^\//, '')
  if (!['', 'index.html', 'about.html', 'how-we-work.html', 'contact.html', 'analytics.html', 'privacy.html'].includes(route)) throw new Error('Unknown site page')
  return new URL(route === 'index.html' ? '' : route, arweaveBase(href))
}
