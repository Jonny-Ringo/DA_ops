import { resolve } from 'path'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { pages, seoPlugin } from './scripts/seo.mjs'

const deployment = JSON.parse(readFileSync(new URL('./.deployments/latest.json', import.meta.url), 'utf8'))

export default defineConfig({
  base: './',
  appType: 'mpa',
  // Use one loopback address so localhost's IPv4/IPv6 split cannot hide a busy port.
  // Let Vite choose the next free port and retain it across config reloads.
  server: { host: '127.0.0.1', strictPort: false },
  preview: { host: '127.0.0.1', strictPort: false },
  plugins: [seoPlugin()],
  define: {
    __ARWEAVE_MANIFEST__: JSON.stringify(deployment.manifestId),
    __ARWEAVE_PAGES__: JSON.stringify(Object.keys(deployment.files).filter(file => file.endsWith('.html'))),
  },
  build: {
    rollupOptions: {
      output: {
        // Keep uploaded asset paths portable, including supplied logo filenames.
        assetFileNames: asset => {
          const name = (asset.names?.[0] || asset.name || 'asset').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')
          return `assets/${name}-[hash][extname]`
        },
      },
      input: Object.fromEntries(Object.keys(pages).map(file => [file.replace(/\/?index\.html$/, '') || 'index', resolve(__dirname, file)])),
    },
  },
})
