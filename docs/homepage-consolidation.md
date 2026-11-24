# Combined homepage: local preview and release requirement

This revision is local on `preview/combined-homepage`. The previous version is
preserved on `main` at `18caccdfdd989cd76dff027c5bc3552c089dd32f`. No deployment or DNS
changes are part of this preview. With a clean working tree, compare the saved
versions using `git switch main` and `git switch preview/combined-homepage`.
Save any subsequent edits before switching branches.

The Community Management content now lives at `/`. About and both guides remain
separate. Navigation, editorial links, sharing links, canonical metadata, service
schema, guide breadcrumbs, and the sitemap point to the combined homepage.

Analytics retains the existing application/site identifiers and historical page
keys, including `/community-management`. New visits record `/`; past community
page events remain in the dashboard. Campaign parameters survive the redirect.

## Local redirect

Both `npm run dev` and `npm run preview` return a real HTTP 301 for
`/community-management`, `/community-management/`, and
`/community-management/index.html`, with `Location: /` plus the original query
string. Preview redirects use `Cache-Control: no-store` so undoing this local
change does not leave a cached redirect in the reviewer's browser. No other
retired routes have been reintroduced.

## Before publishing

**The current GitHub Pages deployment does not run the Vite redirect middleware.**
Publishing the static build alone would leave the old community URL returning
404. A production HTTP redirect must be in place for this revision's release.
An HTML or JavaScript redirect is not a substitute for the requested 301.

The domain currently resolves directly to GitHub Pages with registrar DNS. One
option is to keep GitHub Pages as the origin and put Cloudflare in front of the
domain. That requires a separately approved DNS/proxy setup, preserving all
existing DNS records (including email) and HTTPS. Nothing here applies that change.

Once Cloudflare is configured, add a Single Redirect with this custom expression:

```text
(http.host in {"daops.net" "www.daops.net"} and http.request.uri.path in {"/community-management" "/community-management/" "/community-management/index.html"})
```

- Type: Static
- Target URL: `https://daops.net/`
- Status code: **301**
- Preserve query string: **Enabled** (it defaults to disabled)

Keep the existing HTTP/HTTPS and www/apex canonical behavior. Scope the new rule
only to the paths above. An equivalent rule on another approved host or proxy is
also suitable; no hosting migration has been made in this branch.

Validate the live response before considering publication complete:

```text
GET https://daops.net/community-management/?utm_source=email&utm_medium=cold_email&utm_campaign=community_support
301 Location: https://daops.net/?utm_source=email&utm_medium=cold_email&utm_campaign=community_support
```

The destination must return 200, with canonical `https://daops.net/`. Check a
campaign visit and consultation click in analytics, and confirm that historical
community-page traffic remains visible. Browser fragments such as `#services`
are retained by browsers when the redirect destination has no fragment.

References: [Google's redirect guidance](https://developers.google.com/search/docs/crawling-indexing/301-redirects),
[GitHub Pages static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages),
and [Cloudflare redirect settings](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/).
