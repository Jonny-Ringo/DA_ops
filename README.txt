DA Operations website

Static, multi-page website built with Vite. Includes the public analytics
dashboard, privacy preferences, contact form, and scrolling project logos.

Local development
  npm ci
  npm run dev

Production hosting
  Install command: npm ci
  Build command: npm run build
  Publish/output directory: dist

Serve the generated files with HTTPS. No application server, database, or
deployment wallet is needed to build or host the website. The contact form uses
its existing Formspree endpoint. Analytics uses the existing public Arweave
upload and query services; see ANALYTICS.txt for behavior and privacy details.

Checks
  npm test
  npm run build
  npx playwright install chromium
  npm run test:browser

Arweave publication (optional)
  npm run deploy

This separate command requires the owner's local uploader and wallet.
Set DA_UPLOADER_DIR to that directory when it is not at the original location.
Never add a wallet or private keys to this repository. The tracked
.deployments/latest.json is a public deployment receipt, used only to provide
the latest Arweave address when generating share links outside Arweave.
