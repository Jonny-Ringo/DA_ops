import { trackEvent } from './analytics.js'

export function initContactForm() {
  const form = document.querySelector('.contact-form form')
  if (!form) return
  form.addEventListener('input', () => trackEvent('form_start'), { once: true })
  const status = document.createElement('p')
  status.className = 'form-disclaimer'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  form.append(status)
  let sending = false
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (sending || !form.reportValidity()) return
    sending = true
    const button = form.querySelector('[type="submit"]')
    button.disabled = true
    status.textContent = 'Sending your message…'
    trackEvent('form_submit')
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error('Submission failed')
      trackEvent('form_success')
      status.textContent = 'Thanks — your message has been sent to DA. We’ll respond within one business day.'
      form.reset()
    } catch {
      trackEvent('form_error', 'delivery_unconfirmed')
      status.textContent = 'We couldn’t confirm delivery. Please check your connection and try again.'
    } finally { sending = false; button.disabled = false }
  })
}
