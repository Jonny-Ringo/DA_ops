export function initProjectStrip() {
  const strip = document.querySelector('.project-strip')
  if (!strip) return
  const group = strip.querySelector('.project-logo-group')
  const duplicate = group.cloneNode(true)
  duplicate.setAttribute('aria-hidden', 'true')
  // Keep the visible repeat clickable without adding duplicate keyboard stops.
  duplicate.querySelectorAll('a').forEach(link => link.setAttribute('tabindex', '-1'))
  strip.querySelector('.project-strip-track').append(duplicate)
  strip.classList.add('project-strip-ready')
}
