import { KEYS } from './analytics-core.js'
import { optedOut } from './analytics.js'

export function canPublishCache() {
  try {
    if (import.meta.env.DEV) return false
    const host = location.hostname
    if (location.protocol !== 'https:' || host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || /^127\./.test(host) || optedOut() || !crypto?.subtle) return false
    // Confirm that a persistent preference can be read and written before publishing.
    const value = localStorage.getItem(KEYS.optout)
    localStorage.setItem(KEYS.optout, value ?? 'false')
    return JSON.parse(localStorage.getItem(KEYS.optout)) === false
  } catch { return false }
}
