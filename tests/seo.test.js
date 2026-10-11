import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../dist/', import.meta.url)
const files = ['index.html', 'about.html', 'how-we-work.html', 'contact.html', 'privacy.html', 'analytics.html']
const htmls = await Promise.all(files.map(file => readFile(new URL(file, root), 'utf8')))
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

for (const [i, file] of files.entries()) {
  test(`${file} supplies complete metadata without running JavaScript`, () => {
    const html = htmls[i]
    const metas = [...html.matchAll(/<meta\s+([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([\w:]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])))
    const meta = name => {
      const matches = metas.filter(tag => tag.name === name || tag.property === name)
      assert.equal(matches.length, 1, `Exactly one ${name}`)
      return matches[0].content
    }
    const canonical = `https://daops.net/${file === 'index.html' ? '' : file}`
    assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1)
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`))
    const title = decode(html.match(/<title>(.*?)<\/title>/)[1])
    assert.ok(title.length > 15 && title.length < 70)
    assert.equal(meta('og:title'), title)
    assert.equal(meta('twitter:title'), title)
    assert.ok(meta('description').length > 80 && meta('description').length <= 200)
    assert.equal(meta('og:description'), meta('description'))
    assert.equal(meta('og:url'), canonical)
    assert.equal(meta('og:site_name'), 'DA Operations')
    assert.equal(meta('og:image'), 'https://daops.net/brand/social-preview.png')
    assert.equal(meta('twitter:image'), meta('og:image'))
    assert.equal(meta('og:image:width'), '1200')
    assert.equal(meta('og:image:height'), '630')
    assert.ok(meta('og:image:alt').length > 20)
    assert.equal(meta('twitter:card'), 'summary_large_image')
    assert.equal(meta('twitter:site'), '@DA_Ops1')
    assert.equal(meta('robots').includes('noindex'), file === 'analytics.html')
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1)
    if (file !== 'analytics.html') {
      const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])
      assert.equal(data['@context'], 'https://schema.org')
      assert.ok(data['@graph'].some(node => node['@id'] === `${canonical}#webpage` && node.url === canonical))
      const organization = data['@graph'].find(node => node['@type'] === 'Organization')
      assert.deepEqual(organization.sameAs, ['https://x.com/DA_Ops1'])
    }
  })
}

test('sitemap lists only canonical indexable pages and robots advertises it', async () => {
  const xml = await readFile(new URL('sitemap.xml', root), 'utf8')
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])
  assert.deepEqual(urls, files.filter(file => file !== 'analytics.html').map(file => `https://daops.net/${file === 'index.html' ? '' : file}`))
  const robots = await readFile(new URL('robots.txt', root), 'utf8')
  assert.ok(robots.includes('Allow: /'))
  assert.ok(robots.includes('Sitemap: https://daops.net/sitemap.xml'))
  assert.ok(!robots.includes('Disallow: /'))
  const titles = htmls.map(html => html.match(/<title>(.*?)<\/title>/)[1])
  assert.equal(new Set(titles).size, files.length)
})

test('published preview image is a 1200 by 630 PNG and logo is available', async () => {
  const png = await readFile(new URL('brand/social-preview.png', root))
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
  assert.ok(png.length < 100 * 1024)
  assert.ok((await readFile(new URL('brand/logo.png', root))).length > 0)
})
