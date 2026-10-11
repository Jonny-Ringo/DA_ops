import { resolve } from 'path'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const deployment = JSON.parse(readFileSync(new URL('./.deployments/latest.json', import.meta.url), 'utf8'))

export default defineConfig({
  base: './',
  define: { __ARWEAVE_MANIFEST__: JSON.stringify(deployment.manifestId) },
  build: {
    rollupOptions: {
      output: {
        // Keep uploaded asset paths portable, including supplied logo filenames.
        assetFileNames: asset => {
          const name = (asset.names?.[0] || asset.name || 'asset').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')
          return `assets/${name}-[hash][extname]`
        },
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        'how-we-work': resolve(__dirname, 'how-we-work.html'),
        contact: resolve(__dirname, 'contact.html'),
        analytics: resolve(__dirname, 'analytics.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
    },
  },
})
