import { defineConfig } from '@playwright/test'
import { availablePort } from './scripts/free-port.mjs'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ||= `http://127.0.0.1:${await availablePort()}`
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: { baseURL, browserName: 'chromium', headless: true },
  webServer: { command: `npm run preview -- --host 127.0.0.1 --port ${new URL(baseURL).port}`, url: baseURL, reuseExistingServer: false },
  reporter: 'list',
})
