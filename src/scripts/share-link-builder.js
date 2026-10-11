import { siteUrl } from './site-url.js'

// Normalize labels typed by the site owner; incoming analytics URLs still use
// the strict allowlist in analytics-core.js.
export function shareLabel(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '').slice(0, 64).replace(/[_-]+$/g, '')
}

export function initShareLinkBuilder() {
  const $ = id => document.getElementById(id)
  const form = $('campaign-builder'), result = document.querySelector('.campaign-result')
  let copyTimer
  const invalidate = () => {
    clearTimeout(copyTimer)
    result.hidden = true
    $('campaign-url').value = ''
    $('copy').textContent = 'Copy link'
    for (const id of ['source', 'campaign', 'content']) $(id).setCustomValidity('')
  }
  form.addEventListener('input', invalidate)
  form.addEventListener('change', invalidate)
  form.addEventListener('submit', event => {
    event.preventDefault()
    invalidate()
    const labels = {}
    for (const id of ['source', 'campaign', 'content']) {
      const input = $(id)
      labels[id] = shareLabel(input.value)
      if ((id === 'source' || input.value.trim()) && !labels[id]) {
        const options = input.closest('details')
        if (options) options.open = true
        input.setCustomValidity('Include at least one letter A–Z or number in this label.')
        input.reportValidity()
        return
      }
    }
    const socialSources = ['x', 'twitter', 'facebook', 'linkedin', 'discord', 'instagram', 'reddit', 'tiktok', 'youtube', 'bluesky', 'threads', 'mastodon', 'telegram', 'whatsapp']
    labels.medium = $('medium').value || (labels.source === 'email' ? 'email' : socialSources.includes(labels.source) ? 'social' : 'referral')
    const url = siteUrl($('landing').value)
    for (const field of ['source', 'medium', 'campaign', 'content']) if (labels[field]) url.searchParams.set(`utm_${field}`, labels[field])
    $('campaign-url').value = url.href
    $('campaign-summary').textContent = `Copy this link into your post or message. Visits will appear under “${labels.source}” in Traffic sources.${labels.campaign ? ` Group: “${labels.campaign}” in Shared link results.` : ''}${labels.content ? ` Post label: “${labels.content}”.` : ''}`
    result.hidden = false
  })
  $('copy').addEventListener('click', async () => {
    const link = $('campaign-url').value
    try {
      await navigator.clipboard.writeText(link)
      if ($('campaign-url').value !== link) return
      $('copy').textContent = 'Copied — paste it into your post'
      clearTimeout(copyTimer)
      copyTimer = setTimeout(() => { $('copy').textContent = 'Copy link' }, 2500)
    } catch {
      if ($('campaign-url').value !== link) return
      $('campaign-url').focus()
      $('campaign-url').select()
      $('copy').textContent = 'Select and copy the link above'
    }
  })
}
