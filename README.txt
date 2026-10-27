DA Operations website

Static, multi-page website built with Vite. Includes the public analytics
dashboard, privacy preferences, contact form, and scrolling project logos.

Local development
  npm ci
  npm run dev

Local service restructuring (unpublished)
  Review branch: local/services-restructure
  Original version: main at 03be67a

  Nothing in this review has been pushed or deployed. Run npm run dev from
  this directory and open the printed localhost address to review it.

  To return to the original source, stop the local preview, then run:
    git switch main
    npm run dev

  To return to the restructuring:
    git switch local/services-restructure
    npm run dev

  If using npm run preview instead of npm run dev, run npm run build after
  switching branches so dist matches the selected source. Keep any further
  edits committed or stashed before switching branches.

  Changes and decisions:
  - index.html: early $300 entry offer, four service categories with examples
    and inquiry links, a four-step process, experience, and flexible engagements.
  - how-we-work.html: retained the existing support principles, moved the
    detailed support and AI sections here, and explained project scoping.
  - about.html: broadened the technical and operational experience and aligned
    the community-size statement with the supplied brief (exceeding 80,000).
  - contact.html and src/scripts/contact-form.js: four visible fields, optional
    company/project, required problem description, the existing Formspree
    endpoint and email-copy control, and a honeypot. No new response-time promise.
  - src/styles/styles.css and src/scripts/main.js: kept the dark/teal brand,
    added responsive grids, improved muted-text contrast and focus visibility,
    and added skip-to-content navigation. The homepage needs no reveal animation.
  - scripts/seo.mjs: broader titles and descriptions plus four Service entries
    in homepage JSON-LD. Existing URLs, canonicals, and social image retained.
  - tests/browser/: adapted the existing checks and added inquiry, keyboard,
    CTA, link, and responsive-layout coverage at 320, 390, 768, and 1440 pixels.

  Verification: npm test, npm run build, npm run test:seo, and npm run test:browser.
  Passed: 9 unit tests, 8 SEO checks, the Vite build, and 24 browser tests.
  There is no configured lint command. Form success, failure, validation, and
  spam checks use intercepted requests; live mailbox delivery was not tested.
  Local review screenshots are in the ignored audit directory.

Production hosting
  Install command: npm ci
  Build command: npm run build
  Publish/output directory: dist

GitHub Pages publishes dist through .github/workflows/pages.yml on each push
to main. In Settings > Pages, the source must be GitHub Actions. Serving the
repository source directly skips Vite's build and breaks the browser scripts.
The custom domain daops.net is configured in the repository's Pages settings.

Serve the generated files with HTTPS. No application server, database, or
deployment wallet is needed to build or host the website. The contact form uses
its existing Formspree endpoint. Analytics uses the existing public Arweave
upload and query services; see ANALYTICS.txt for behavior and privacy details.

Checks
  npm test
  npm run build
  npm run test:seo
  npx playwright install chromium
  npm run test:browser

Search and social metadata
scripts/seo.mjs supplies unique titles, descriptions, absolute canonical URLs,
Open Graph and X cards, and Organization/WebSite/WebPage/breadcrumb JSON-LD
in the HTML at build time. It also generates robots.txt and sitemap.xml.
The preferred search address is https://daops.net/. Analytics stays noindex.
The official X profile is https://x.com/DA_Ops1.

The preview image is checked in at public/brand/social-preview.png. Regenerate
it with npm run social:image after installing Playwright Chromium. This is a
local design step, not required for hosting builds. npm run test:seo validates
the built metadata and image and runs before every GitHub Pages deployment.

Submit https://daops.net/sitemap.xml in Google Search Console and Bing
Webmaster Tools after verifying domain ownership in those services.

Arweave publication (optional)
  npm run deploy

This separate command requires the owner's local uploader and wallet.
Set DA_UPLOADER_DIR to that directory when it is not at the original location.
Never add a wallet or private keys to this repository. The tracked
.deployments/latest.json is a public deployment receipt, used only to provide
the latest Arweave address when generating share links outside Arweave.
