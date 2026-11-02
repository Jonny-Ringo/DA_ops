export function initContact() {
  const copyButton = document.querySelector('.copy-email')
  const copyTooltip = document.querySelector('.copy-email-tooltip')
  if (copyButton && copyTooltip) {
    let tooltipTimer
    copyButton.addEventListener('click', async () => {
      clearTimeout(tooltipTimer)
      try {
        await navigator.clipboard.writeText(copyButton.dataset.email)
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
}
