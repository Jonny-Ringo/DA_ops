// Match GitHub Pages' directory URL normalization in local development/preview.
// The actual page move is the static HTML redirect in community-management/index.html.
function normalizeCommunityDirectory(req, res, next) {
  const [path] = req.url.split('?')
  if (!['GET', 'HEAD'].includes(req.method) || path !== '/community-management') return next()
  const queryAt = req.url.indexOf('?')
  res.writeHead(301, {
    Location: `/community-management/${queryAt === -1 ? '' : req.url.slice(queryAt)}`,
    'Cache-Control': 'no-store',
  })
  res.end()
}

export function redirectsPlugin() {
  return {
    name: 'da-directory-url',
    configureServer(server) { server.middlewares.use(normalizeCommunityDirectory) },
    configurePreviewServer(server) { server.middlewares.use(normalizeCommunityDirectory) },
  }
}
