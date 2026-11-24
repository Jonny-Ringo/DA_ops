import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

export const site = 'https://daops.net/'
export const pages = {
  'index.html': {
    path: '', name: 'Home', type: 'WebPage', service: true,
    title: 'Community Management & Technical Support | DA Operations',
    description: 'Community management, technical support, and reporting for growing teams and Web3 ecosystems. Custom dashboards, developer onboarding, and ongoing operations.',
  },
  'about/index.html': {
    path: 'about/', name: 'About', type: 'AboutPage',
    title: 'About DA Operations | Technical & Operational Experience',
    description: 'Meet Jon Williams, Founder and CEO of DA Operations. Experience in technical support, developer onboarding, and operations for communities exceeding 80,000 members.',
  },
  'discord-community-management-scope/index.html': {
    path: 'discord-community-management-scope/', name: 'Discord Community Management Guide', type: 'WebPage', article: true,
    title: 'Discord Community Management: Setup & Support | DA Ops.',
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
      founder: { '@type': 'Person', name: 'Jon Williams', jobTitle: 'Founder and CEO', url: 'https://jonnyringo.arweave.net' },
    },
    { '@type': 'WebSite', '@id': `${site}#website`, url: site, name: 'DA Operations', inLanguage: 'en-US', publisher: { '@id': `${site}#organization` } },
    {
      '@type': page.type, '@id': `${url}#webpage`, url, name: page.title, description: page.description,
      inLanguage: 'en-US', isPartOf: { '@id': `${site}#website` }, about: { '@id': `${site}#organization` },
      primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
      ...(page.path && page.breadcrumb !== false ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    },
  ]
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
      { '@type': 'ListItem', position: 2, name: page.name, item: url },
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
