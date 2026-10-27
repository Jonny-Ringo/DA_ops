import { trackEvent } from './analytics.js'

export function initContactForm() {
  const form = document.querySelector('.contact-form form')
  if (!form) return
  const copyButton = document.querySelector('.copy-email')
  const copyTooltip = document.querySelector('.copy-email-tooltip')
  if (copyButton && copyTooltip) {
    let tooltipTimer
    copyButton.addEventListener('click', async () => {
      clearTimeout(tooltipTimer)
      try {
        await navigator.clipboard.writeText(copyButton.textContent.trim())
        copyTooltip.textContent = 'Copied'
      } catch {
        copyTooltip.textContent = 'Couldn’t copy. Select the address to copy it manually.'
      }
      copyTooltip.classList.add('is-visible')
      tooltipTimer = setTimeout(() => {
        copyTooltip.classList.remove('is-visible')
        copyTooltip.textContent = ''
      }, 3000)
    })
  }
  form.addEventListener('input', () => trackEvent('form_start'), { once: true })
  const status = document.createElement('p')
  status.className = 'form-disclaimer'
  status.id = 'contact-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  form.append(status)
  let sending = false
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (sending || !form.reportValidity()) return
    // Formspree also recognizes this honeypot on native (no-JavaScript) posts.
    if (form.elements.namedItem('_gotcha')?.value) return
    sending = true
    const button = form.querySelector('[type="submit"]')
    button.disabled = true
    status.textContent = 'Sending your message…'
    trackEvent('form_submit')
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
      if (!response.ok) {
        // Record only the HTTP status, never provider responses or form contents.
        trackEvent('form_error', `provider_http_${response.status}`)
        status.textContent = response.status === 429
          ? 'The message service is receiving too many requests. Please wait a few minutes and try again. Your entries are still here.'
          : 'The message service could not accept your submission. Your entries are still here. Please try again later.'
        return
      }
      trackEvent('form_success')
      status.textContent = 'Thanks — your message has been sent to DA. We’ll follow up to discuss what you need.'
      form.reset()
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError'
      trackEvent('form_error', timedOut ? 'delivery_timeout' : 'connection_unconfirmed')
      status.textContent = timedOut
        ? 'The message service took too long to respond, so we couldn’t confirm delivery. Your entries are still here. Please wait before trying again.'
        : 'We couldn’t connect to confirm delivery. Your entries are still here. Please check your connection and try again.'
    } finally { sending = false; button.disabled = false }
  })
}
