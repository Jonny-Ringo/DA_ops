import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Uses the uploader dependencies and wallet supplied by the project owner.
// Only files from this website's dist directory are eligible for publication.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploader = process.env.DA_UPLOADER_DIR || 'C:/Users/User/Desktop/Agent-Perma-Bin';
const require = createRequire(path.join(uploader, 'package.json'));
const { ArweaveSigner, createData } = require('arbundles');
const publish = process.argv.includes('--publish');
const service = 'https://up.arweave.net';
const pages = ['index.html', 'about.html', 'how-we-work.html', 'contact.html', 'analytics.html', 'privacy.html'];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const files = new Map();

async function collect(directory, prefix = '') {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory() && ['assets', 'brand'].includes(relative)) {
      await collect(path.join(directory, entry.name), relative + '/');
    } else if (entry.isFile() && (pages.includes(relative) || ['robots.txt', 'sitemap.xml', 'brand/logo.png', 'brand/social-preview.png'].includes(relative) || /^assets\/[\w.-]+\.(css|js|png)$/.test(relative))) {
      let data = await fs.readFile(path.join(directory, entry.name));
      if (relative.endsWith('.html')) {
        // Keep navigation and assets inside the manifest when opened by transaction ID.
        data = Buffer.from(data.toString('utf8').replace(/\b(href|src|content)="\/(?!\/)/g, '$1="./'));
      }
      if (data.length >= 100 * 1024) throw new Error(`Review oversized upload: ${relative}`);
      files.set(relative, data);
    } else {
      throw new Error(`Unexpected build entry; refusing to publish: ${relative}`);
    }
  }
}

await collect(path.join(root, 'dist'));
for (const page of pages) {
  if (!files.has(page)) throw new Error(`Missing page: ${page}`);
  const html = files.get(page).toString('utf8');
  for (const match of html.matchAll(/\b(?:href|src)="\.\/([^"#?]*)/g)) {
    const target = match[1] || 'index.html';
    if (!files.has(target)) throw new Error(`Broken local reference in ${page}: ${target}`);
  }
}
console.log('DA Operations deployment files:');
for (const [name, data] of files) console.log(`  ${name}: ${data.length} bytes`);
if (!publish) {
  console.log('Preflight passed. Add --publish to upload these files and the path manifest.');
  process.exit(0);
}

const wallet = JSON.parse(await fs.readFile(path.join(uploader, 'wallet.json'), 'utf8'));
const signer = new ArweaveSigner(wallet);
const receiptDir = path.join(root, '.deployments');
await fs.mkdir(receiptDir, { recursive: true });
const receipt = { startedAt: new Date().toISOString(), service, files: {} };
const receiptPath = path.join(receiptDir, `arweave-${Date.now()}.json`);
const saveReceipt = () => fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
await saveReceipt();

async function upload(data, contentType, name) {
  const item = createData(data, signer, { tags: [
    { name: 'Content-Type', value: contentType },
    { name: 'App-Name', value: 'DA-Operations' },
    { name: 'Type', value: name === 'manifest' ? 'manifest' : 'app-asset' },
    { name: 'File-Path', value: name },
  ] });
  await item.sign(signer);
  const id = item.id;
  if (!/^[\w-]{43}$/.test(id)) throw new Error('Invalid signed item ID');
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${service}/tx`, {
        method: 'POST', headers: { 'content-type': 'application/octet-stream' },
        body: item.getRaw(), signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const error = new Error(`Upload ${name}: HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      // The signed item ID is authoritative; never log wallet or signed payload.
      await response.arrayBuffer();
      console.log(`Uploaded ${name}: ${id}`);
      return id;
    } catch (error) {
      if (attempt === 3 || (error.status && error.status < 500 && error.status !== 429)) throw error;
      console.log(`Retrying ${name} (${attempt + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }
}

const paths = {};
// Assets first, so sharing metadata can use a complete, public image URL.
const ordered = [...files].sort(([a], [b]) => Number(a.endsWith('.html')) - Number(b.endsWith('.html')));
for (const [name, original] of ordered) {
  let data = original;
  if (name.endsWith('.html')) {
    data = Buffer.from(data.toString('utf8').replace(/(<meta\s+(?:property="og:image"|name="twitter:image")\s+content=")\.\/([^" ]+)/g,
      (_, prefix, asset) => {
        if (!paths[asset]) throw new Error(`Missing social image: ${asset}`);
        return `${prefix}https://arweave.net/${paths[asset].id}`;
      }));
  }
  const id = await upload(data, types[path.extname(name)], name);
  paths[name] = { id };
  receipt.files[name] = { id, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  await saveReceipt();
}
for (const page of pages.filter(page => page !== 'index.html')) {
  paths[page.replace(/\.html$/, '')] = paths[page];
}
const manifest = { manifest: 'arweave/paths', version: '0.2.0', index: { path: 'index.html' }, paths };
const manifestId = await upload(Buffer.from(JSON.stringify(manifest)), 'application/x.arweave-manifest+json', 'manifest');
receipt.manifestId = manifestId;
receipt.url = `https://arweave.net/${manifestId}/`;
receipt.completedAt = new Date().toISOString();
await saveReceipt();
await fs.writeFile(path.join(receiptDir, 'latest.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`Published: ${receipt.url}`);
console.log(`Receipt: ${receiptPath}`);
console.log('Share this arweave.net manifest URL to open the published site.');
