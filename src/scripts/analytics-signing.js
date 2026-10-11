// Minimal RSA ANS-104 writer. Uses WebCrypto; no wallet extension or funded key.
// Wire/signature compatibility is tested against arbundles' independent verifier.
const utf8 = value => new TextEncoder().encode(value)
const concat = (...parts) => {
  const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.length }
  return bytes
}
const hash = async bytes => new Uint8Array(await crypto.subtle.digest('SHA-384', bytes))
async function deepHash(value) {
  if (!Array.isArray(value)) return hash(concat(await hash(utf8(`blob${value.length}`)), await hash(value)))
  let result = await hash(utf8(`list${value.length}`))
  for (const part of value) result = await hash(concat(result, await deepHash(part)))
  return result
}
function avroLong(value) {
  const bytes = []
  let n = value * 2
  do { const next = n & 127; n = Math.floor(n / 128); bytes.push(next | (n ? 128 : 0)) } while (n)
  return Uint8Array.from(bytes)
}
function littleEndian(value) {
  const bytes = new Uint8Array(8)
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true)
  return bytes
}
export const toBase64 = bytes => btoa(String.fromCharCode(...bytes))
export const fromBase64 = text => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0))

export async function generateWallet() {
  const pair = await crypto.subtle.generateKey({ name: 'RSA-PSS', modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  return crypto.subtle.exportKey('jwk', pair.privateKey)
}

export async function signEvent(event, tags, jwk) {
  const owner = fromBase64(jwk.n)
  if (owner.length !== 512) throw new Error('Expected RSA-4096 analytics key')
  const rawTags = concat(avroLong(tags.length), ...tags.flatMap(tag => [tag.name, tag.value].flatMap(value => { const bytes = utf8(value); return [avroLong(bytes.length), bytes] })), new Uint8Array([0]))
  if (rawTags.length > 4096) throw new Error('Analytics tags too large')
  const data = utf8(JSON.stringify(event))
  const message = await deepHash([utf8('dataitem'), utf8('1'), utf8('1'), owner, new Uint8Array(), new Uint8Array(), rawTags, data])
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, key, message))
  return concat(new Uint8Array([1, 0]), signature, owner, new Uint8Array([0, 0]), littleEndian(tags.length), littleEndian(rawTags.length), rawTags, data)
}
