// Local development/preview only. Static GitHub Pages cannot execute middleware.
// Configure the equivalent production rule before release; see docs/homepage-consolidation.md.
const movedPaths = new Set(['/community-management', '/community-management/', '/community-management/index.html'])

function redirectCommunityManagement(req, res, next) {
  const [path] = req.url.split('?')
  if (!['GET', 'HEAD'].includes(req.method) || !movedPaths.has(path)) return next()
  const queryAt = req.url.indexOf('?')
  res.writeHead(301, {
    Location: `/${queryAt === -1 ? '' : req.url.slice(queryAt)}`,
    // Allow reviewers to switch back to the old local branch without a cached redirect.
    'Cache-Control': 'no-store',
  })
  res.end()
}

export function redirectsPlugin() {
  return {
    name: 'da-local-redirects',
    configureServer(server) { server.middlewares.use(redirectCommunityManagement) },
    configurePreviewServer(server) { server.middlewares.use(redirectCommunityManagement) },
  }
}
