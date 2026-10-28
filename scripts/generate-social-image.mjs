import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Render the site's typography and existing logo without remote font/image requests.
const logo = (await readFile(new URL('../images/logo.png', import.meta.url))).toString('base64')
const output = new URL('../public/brand/social-preview.png', import.meta.url)
await mkdir(new URL('../public/brand/', import.meta.url), { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#0d1117;color:#e6edf3;font-family:Arial,sans-serif;padding:58px 70px;border-top:8px solid #4dd0e1}
    header{display:flex;align-items:center;gap:18px;font-size:30px;font-weight:700}
    img{width:64px;height:64px;border-radius:14px}h1{font-size:76px;line-height:1.07;letter-spacing:-3px;margin:55px 0 24px;max-width:1000px;font-weight:700}
    h1 span{color:#4dd0e1}p{font-size:26px;color:#a9b5c3;margin:0}footer{display:flex;justify-content:space-between;align-items:center;margin-top:52px;border-top:1px solid #30363d;padding-top:25px;font-size:20px;color:#a9b5c3}strong{font-weight:600;color:#4dd0e1}
  </style><header><img src="data:image/png;base64,${logo}" alt="">DA Operations</header>
  <h1>Technical assistance,<br><span>analytics &amp; automation.</span></h1>
  <p>Scoped projects and ongoing operations.</p>
  <footer><span>DA Operations</span><strong>daops.net</strong></footer></html>`)
  await page.locator('img').evaluate(image => image.decode())
  await page.screenshot({ path: fileURLToPath(output), type: 'png' })
} finally {
  await browser.close()
}
