# Combined homepage and community-page redirect

The Community Management content now lives at `/`. About and both guides remain
separate. Navigation, editorial links, sharing links, canonical metadata, service
schema, guide breadcrumbs, and the sitemap reference the combined homepage.

The previous published version is preserved at
`18caccdfdd989cd76dff027c5bc3552c089dd32f`. The work is recorded on
`preview/combined-homepage` and merged into `main` for the release.

## Redirect on GitHub Pages

The user approved an immediate HTML redirect instead of an HTTP 301 because the
current host cannot configure custom server-side redirects. No DNS or hosting
migration is needed.

`community-management/index.html` is built as a standalone redirect. It
returns HTTP 200 with a zero-second meta refresh pointing to the homepage and a
canonical of `https://daops.net/`. Google recognizes an immediate meta refresh as
a permanent redirect signal; it is not an HTTP 301.

A small inline script uses `location.replace` to retain the complete query string
(including UTM labels) and fragment without leaving the moved page in browser
history. Without JavaScript, the meta refresh still takes visitors to the
homepage, but cannot carry arbitrary query parameters forward. The redirect page
loads no analytics, so a normal redirected visit records only the destination.

`/community-management/` and `/community-management/index.html` use this page.
GitHub Pages normalizes the slashless directory URL before serving it. The old
`.html` route and other previously retired routes remain retired. The moved URL
is excluded from the sitemap, remains crawlable, and has no `noindex` directive.
Local development and preview mirror GitHub's directory-slash normalization;
the page move itself always uses the built HTML rather than server middleware.

## Analytics continuity

Existing application/site identifiers and historical page keys, including
`/community-management`, are retained. New visits record `/`; past community-page
events remain available in the dashboard. Browser tests check campaign attribution,
consultation clicks, and historical community-page traffic together with new visits.

## Release checks

Build and SEO checks verify canonical tags, structured data, sitemap contents,
and the redirect file. Browser checks exercise the actual static redirect with
and without JavaScript, query/fragment preservation, back-button behavior,
mobile layouts, links, and analytics. Verify the same behavior on `daops.net`
after GitHub Pages deployment completes.

Existing HTTP-to-HTTPS and www-to-apex redirects remain handled by GitHub Pages.
A server-side 301 can replace the HTML redirect later if a proxy or different host
is introduced. It would need query-string preservation enabled.

References: [Google's redirect guidance](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
and [GitHub Pages static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
