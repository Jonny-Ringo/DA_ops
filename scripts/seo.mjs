import { basename } from 'node:path'

export const site = 'https://daops.net/'
export const pages = {
  'index.html': {
    path: '', name: 'Home', type: 'WebPage',
    title: 'DA Operations | Technical Assistance, Analytics & Automation',
    description: 'Technical assistance, data collection, custom dashboards, and workflow automation, alongside managed customer support and community operations. Human operated. AI accelerated.',
  },
  'about.html': {
    path: 'about.html', name: 'About', type: 'AboutPage',
    title: 'About DA Operations | Technical & Operational Experience',
    description: 'Meet DA Operations and founder Jonny Ringo. Technical investigations, developer support, and ecosystem operations for communities exceeding 80,000 members.',
  },
  'how-we-work.html': {
    path: 'how-we-work.html', name: 'How We Work', type: 'WebPage',
    title: 'How We Work | Scoped Projects & Ongoing Operations | DA Operations',
    description: 'From one technical fix to ongoing operations: discover how DA scopes projects, investigates problems, and combines hands-on expertise with AI-assisted workflows.',
  },
  'contact.html': {
    path: 'contact.html', name: 'Contact', type: 'ContactPage',
    title: 'Contact DA Operations | Get a Project Quote or Ongoing Support',
    description: 'Tell DA Operations what you need. Free initial assessment, small defined tasks from $149, and custom quotes for dashboards, larger implementations, and ongoing support.',
  },
  'privacy.html': {
    path: 'privacy.html', name: 'Analytics Privacy', type: 'WebPage',
    title: 'Analytics Privacy & Preferences | DA Operations',
    description: 'Learn what DA Operations website analytics collects, how public Arweave storage works, and how to manage your browser tracking preferences.',
  },
  'analytics.html': {
    path: 'analytics.html', name: 'Site Activity', type: 'WebPage', noindex: true,
    title: 'Site Activity & Analytics | DA Operations',
    description: 'View public DA Operations website traffic, engagement, and shared link results. Create tracked links and manage this browser’s analytics preferences.',
  },
}

const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const services = [
  { id: 'technical-fixes', name: 'Technical Fixes & Automation', description: 'Technical assistance, troubleshooting, API integrations, data collection, and operational automation. Start with one defined task; larger implementations receive a custom quote.' },
  { id: 'customer-support', name: 'Customer Support & Operations', description: 'Technical customer support, backlog cleanup, onboarding, support workflow improvements, and documentation. Start with a defined review or improvement project with agreed deliverables and a custom quote.' },
  { id: 'reporting', name: 'Reporting & Intelligence', description: 'Data collection, custom dashboards, community and ecosystem statistics, support analytics, reporting automation, and infrastructure monitoring with clearly defined deliverables and pricing.' },
  { id: 'managed-operations', name: 'Managed Technical & Community Operations', description: 'Managed customer support, developer support services, community and ecosystem operations, partnership coordination, and technical operations consulting. Discovery call followed by a custom monthly proposal.' },
]

export function renderMetadata(page) {
  const url = new URL(page.path, site).href
  const image = new URL('brand/social-preview.png', site).href
  const imageAlt = 'DA Operations. Technical assistance, analytics and automation. Scoped projects and ongoing operations. daops.net.'
  const graph = [
    {
      '@type': 'Organization', '@id': `${site}#organization`, name: 'DA Operations', url: site,
      description: pages['index.html'].description,
      sameAs: ['https://x.com/DA_Ops1'],
      logo: { '@type': 'ImageObject', url: `${site}brand/logo.png`, width: 129, height: 129 },
      founder: { '@type': 'Person', name: 'Jonny Ringo', url: 'https://jonnyringo.arweave.net' },
    },
    { '@type': 'WebSite', '@id': `${site}#website`, url: site, name: 'DA Operations', inLanguage: 'en-US', publisher: { '@id': `${site}#organization` } },
    {
      '@type': page.type, '@id': `${url}#webpage`, url, name: page.title, description: page.description,
      inLanguage: 'en-US', isPartOf: { '@id': `${site}#website` }, about: { '@id': `${site}#organization` },
      primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
      ...(page.path ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    },
  ]
  if (!page.path) {
    graph[2].mainEntity = services.map(service => ({ '@id': `${site}#${service.id}-service` }))
    graph.push(...services.map(service => ({
      '@type': 'Service', '@id': `${site}#${service.id}-service`,
      name: service.name, serviceType: service.name, description: service.description,
      url: `${site}#${service.id}`, provider: { '@id': `${site}#organization` },
    })))
  }
  if (page.path) graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site },
      { '@type': 'ListItem', position: 2, name: page.name, item: url },
    ],
  })
  return `
    <title>${escape(page.title)}</title>
    <meta name="description" content="${escape(page.description)}">
    <link rel="canonical" href="${url}">
    <meta name="robots" content="${page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="DA Operations">
    <meta property="og:locale" content="en_US">
    <meta property="og:title" content="${escape(page.title)}">
    <meta property="og:description" content="${escape(page.description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:secure_url" content="${image}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${imageAlt}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@DA_Ops1">
    <meta name="twitter:title" content="${escape(page.title)}">
    <meta name="twitter:description" content="${escape(page.description)}">
    <meta name="twitter:image" content="${image}">
    <meta name="twitter:image:alt" content="${imageAlt}">
    ${page.noindex ? '' : `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`}
  `
}

export function seoPlugin() {
  return {
    name: 'da-static-metadata',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const page = pages[basename(context.filename)]
        return page ? html.replace('<!-- SITE_METADATA -->', renderMetadata(page)) : html
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n` })
      const urls = Object.values(pages).filter(page => !page.noindex).map(page => `  <url><loc>${new URL(page.path, site).href}</loc></url>`).join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
    },
  }
}
