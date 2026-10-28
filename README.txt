DA Operations website

Static, multi-page website built with Vite. Includes the public analytics
dashboard, privacy preferences, contact form, and scrolling project logos.

Local development
  npm ci
  npm run dev

Service restructuring and homepage update
  Review branch: local/services-restructure
  Original version: 03be67a
  Local rollback reference: backup/pre-homepage-update

  Publishing main triggers the existing GitHub Pages deployment to daops.net.
  Run npm run dev and open the printed localhost address for local review.

  To review the original source locally, stop the preview, then run:
    git switch backup/pre-homepage-update
    npm run dev

  To return to the current source:
    git switch main
    npm run dev

  Switching branches only changes the local preview. To roll back production,
  revert the update commits on main and push the revert through the same
  GitHub Pages workflow; retain the history rather than force-pushing.

  If using npm run preview instead of npm run dev, run npm run build after
  switching branches so dist matches the selected source. Keep any further
  edits committed or stashed before switching branches.

  Changes and decisions:
  - index.html: a compact entry offer, four service categories with examples
    and inquiry links, a four-step process, experience, and flexible engagements.
  - how-we-work.html: retained the existing support principles, moved the
    detailed support and AI sections here, and explained project scoping.
  - about.html: broadened the technical and operational experience and aligned
    the community-size statement with the supplied brief (exceeding 80,000).
  - contact.html and src/scripts/contact-form.js: four visible fields, optional
    company/project, required problem description, the existing Formspree
    endpoint and email-copy control, and a honeypot. The conversion update adds
    the owner-confirmed usual reply expectation of one business day by email.
  - src/styles/styles.css and src/scripts/main.js: kept the dark/teal brand,
    added responsive grids, improved muted-text contrast and focus visibility,
    and added skip-to-content navigation. The homepage needs no reveal animation.
  - scripts/seo.mjs: broader titles and descriptions plus four Service entries
    in homepage JSON-LD. Existing URLs, canonicals, and social image retained.
  - tests/browser/: adapted the existing checks and added inquiry, keyboard,
    CTA, link, and responsive-layout coverage at 320, 390, 768, and 1440 pixels.

  Verification: npm test, npm run build, npm run test:seo, and npm run test:browser.
  Checks cover unit behavior, SEO metadata, the Vite build, and browser flows.
  There is no configured lint command. Form success, failure, validation, and
  spam checks use intercepted requests. See CONVERSION-REVIEW.txt for the single
  controlled live delivery test and its verification status.
  Local review screenshots are in the ignored audit directory.

Focused homepage enhancements
  These changes follow the local restructuring checkpoint at 90e64e1.
  The layout, navigation, four service categories, and project logos remain.
  The existing entry section now offers a free initial assessment and small,
  defined tasks starting at $149. Larger implementations and complex dashboards
  receive custom quotes. Pricing is consistent on the supporting pages and in
  search metadata; the hero emphasizes technical and operational capability.
  Homepage headings stay plain and descriptive. Promotional labels and repeated
  slogans were removed at the owner's request; keep that wording preference.

  The Eye is featured below the entry offer. Its screenshot is the owner's
  supplied image (680 x 367), used without alteration. It is now stored at
  public/projects/the-eye.png so the full-size link also works without JavaScript.
  It shows the application's Arweave and AO network statistics and transaction
  analytics. This is a screenshot, not a live data feed or generated mockup.
  The visible caption explains the dependency on data and integrations.

  Technical claims were checked against the local project at:
    C:/Users/User/Desktop/AO_Projects_Master/The_Eye/dev
  package.json and index.html show a JavaScript/Vite frontend with Chart.js.
  api.js queries AO with aoconnect, Goldsky GraphQL, and reporting APIs.
  The reporting services use Node/Express and SQLite; the deployment script
  uploads the built application to Arweave. The public page also loads Chart.js.
  The showcase describes Arweave hosting and AO queries without suggesting all
  data is stored on-chain. No changes were made to The Eye's project itself.

  Changed: index.html, src/styles/styles.css, public/projects/the-eye.png,
  contact.html, about.html, how-we-work.html, scripts/seo.mjs, the existing
  browser checks in inquiries.spec.js and project-strip.spec.js, and this file.

Conversion improvements
  See CONVERSION-REVIEW.txt for the implemented changes, verified business
  details, The Eye dependency findings, measurements, and remaining checks.
  Before/after captures and raw measurements are kept in the ignored audit folder.
  To reproduce the local benchmark, build and run the preview on port 4173, then:
    node scripts/measure-site.mjs after

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
