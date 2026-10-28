const services = new Set(['technical-fixes', 'customer-support', 'reporting', 'managed-operations'])

// Accept only published service identifiers, never arbitrary query or form text.
export const serviceId = value => services.has(value) ? value : ''
export const serviceDetail = value => serviceId(value) ? `service:${serviceId(value)}` : ''
