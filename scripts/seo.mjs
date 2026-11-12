import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

export const site = 'https://daops.net/'
export const pages = {
  'index.html': {
    path: '', name: 'Home', type: 'WebPage',
    title: 'DA Operations | Community Management & Technical Support',
    description: 'Community management, technical support, and reporting for growing teams and Web3 ecosystems. Custom dashboards, developer onboarding, and ongoing operations.',
  },
  'about/index.html': {
    path: 'about/', name: 'About', type: 'AboutPage',
    title: 'About DA Operations | Technical & Operational Experience',
    description: 'Meet DA Operations and founder Jonny Ringo. Technical investigations, developer support, and ecosystem operations for communities exceeding 80,000 members.',
  },
  'contact/index.html': {
    path: 'contact/', name: 'Contact', type: 'ContactPage',
    title: 'Book a Consultation | DA Operations',
    description: 'Book a free consultation with DA Operations about community support, reporting dashboards, data collection, or ongoing operations.',
  },
  'community-management/index.html': {
    path: 'community-management/', name: 'Community Management', type: 'WebPage', service: true,
    title: 'Community Management Services | Discord & Web3 | DA Ops',
    description: 'Technical community management for Discord, Telegram, and Web3 ecosystems. Human-led support, developer onboarding, moderation, and reporting.',
  },
  'discord-community-management-scope/index.html': {
    path: 'discord-community-management-scope/', name: 'Discord Community Management Guide', type: 'WebPage', article: true,
    title: 'Let’s Build a Helpful, Efficient Discord | DA Operations',
    description: 'A guide to Discord community management: onboarding, permissions, channels, roles, bots, moderation, and ongoing support and reporting.',
    heading: 'Let’s Build a Helpful, Efficient Discord',
  },
  'technical-support-escalation/index.html': {
    path: 'technical-support-escalation/', name: 'Technical Support Escalation', type: 'WebPage', article: true,
    title: 'Escalating Community Support to Engineering | DA Operations',
    description: 'How technical community support investigates issues, prepares useful engineering handoffs, and follows through, with an illustrative community issue report.',
    heading: 'How Community Support Should Escalate Issues to Engineering',
  },
  'privacy/index.html': {
    path: 'privacy/', name: 'Analytics Privacy', type: 'WebPage',
    title: 'Analytics Privacy & Preferences | DA Operations',
    description: 'Learn what DA Operations website analytics collects, how public Arweave storage works, and how to manage your browser tracking preferences.',
  },
  'analytics/index.html': {
    path: 'analytics/', name: 'Site Activity', type: 'WebPage', noindex: true,
    title: 'Site Activity & Analytics | DA Operations',
    description: 'View public DA Operations website traffic, engagement, and shared link results. Create tracked links and manage this browser’s analytics preferences.',
  },
}

const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const services = [
  { id: 'customer-support', name: 'Technical & Community Support', description: 'Customer and technical support, community and social profile management, customer and developer onboarding, backlog cleanup, escalations, support reporting, team coordination, documentation, and workflow improvements. Support setup improvements or ongoing delivery.' },
  { id: 'reporting', name: 'Reporting & Intelligence', description: 'Data collection, custom dashboards, community trends and ecosystem statistics, support analytics, reporting automation, and infrastructure monitoring with clearly defined deliverables and pricing.' },
  { id: 'executive-operations', name: 'Executive Operations & Partnerships', description: 'Work with founders and leadership on team management, planning, partner outreach, and ongoing ecosystem coordination. Event coordination includes hackathons and booths at conferences such as ETHDenver, with support for individual initiatives or ongoing operations.' },
  { id: 'technical-fixes', name: 'Technical Fixes & Automation', description: 'Application troubleshooting, API integrations, internal tools, and operational automation. Scoped and quoted after an initial review of your project and requirements.' },
]

export function renderMetadata(page) {
  const url = new URL(page.path, site).href
  const image = new URL('brand/social-preview.png', site).href
  const imageAlt = 'DA Operations. Community management and technical support. Reporting, partnerships and ongoing operations. daops.net.'
  const graph = [
    {
      '@type': 'Organization', '@id': `${site}#organization`, name: 'DA Operations', url: site,
      description: pages['index.html'].description,
      sameAs: ['https://x.com/DA_Ops1'],
      logo: { '@type': 'ImageObject', url: `${site}brand/logo.png`, width: 129, height: 129 },
      founder: { '@type': 'Person', name: 'Jon Williams', alternateName: 'Jonny Ringo', url: 'https://jonnyringo.arweave.net' },
    },
    { '@type': 'WebSite', '@id': `${site}#website`, url: site, name: 'DA Operations', inLanguage: 'en-US', publisher: { '@id': `${site}#organization` } },
    {
      '@type': page.type, '@id': `${url}#webpage`, url, name: page.title, description: page.description,
      inLanguage: 'en-US', isPartOf: { '@id': `${site}#website` }, about: { '@id': `${site}#organization` },
      primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
      ...(page.path && page.breadcrumb !== false ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
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
  if (page.service) {
    graph[2].mainEntity = { '@id': `${url}#service` }
    graph.push({
      '@type': 'Service', '@id': `${url}#service`, name: 'Technical Community Management & Support',
      serviceType: 'Community management and technical support', url,
      description: page.description, provider: { '@id': `${site}#organization` },
    })
  }
  if (page.article) {
    graph[2].mainEntity = { '@id': `${url}#article` }
    graph.push({
      '@type': 'Article', '@id': `${url}#article`, headline: page.heading, description: page.description,
      mainEntityOfPage: { '@id': `${url}#webpage` }, image,
      author: { '@id': `${site}#organization` }, publisher: { '@id': `${site}#organization` },
    })
  }
  if (page.path && page.breadcrumb !== false) graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site },
      ...(page.article ? [{ '@type': 'ListItem', position: 2, name: 'Community Management', item: `${site}community-management/` }] : []),
      { '@type': 'ListItem', position: page.article ? 3 : 2, name: page.name, item: url },
    ],
  })
  return `
    <title>${escape(page.title)}</title>
    <meta name="description" content="${escape(page.description)}">
    <link rel="canonical" href="${url}">
    <meta name="robots" content="${page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}">
    <meta property="og:type" content="${page.article ? 'article' : 'website'}">
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
        const page = pages[relative(root, context.filename).replace(/\\/g, '/')]
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
