import { APP_NAME, SITE_ID, VERSION, QUERY_URLS, parseEvent } from './analytics-core.js'

const query = `query Analytics($tags: [TagFilter!], $after: String) {
  transactions(tags: $tags, first: 100, after: $after, sort: HEIGHT_DESC) {
    pageInfo { hasNextPage }
    edges { cursor node { id tags { name value } } }
  }
}`

export async function fetchAnalytics(dates, onProgress = () => {}, continuation = null) {
  const tags = [
    { name: 'App-Name', values: [APP_NAME] }, { name: 'Site-ID', values: [SITE_ID] },
    { name: 'Environment', values: ['production'] }, { name: 'Schema-Version', values: [VERSION] },
    { name: 'Timestamp', values: dates },
  ]
  let lastError
  // A cursor is only used with the endpoint that issued it.
  for (const endpoint of continuation ? [continuation.endpoint] : QUERY_URLS) {
    let after = continuation?.after || null
    const seenCursors = new Set()
    const events = new Map()
    let scanned = 0
    try {
      for (let page = 0; page < 100; page++) {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { tags, after } }), signal: AbortSignal.timeout(20000) })
        if (!response.ok) throw new Error(`Query service returned HTTP ${response.status}`)
        const result = await response.json()
        if (result.errors?.length || !Array.isArray(result.data?.transactions?.edges)) throw new Error('Query service returned an invalid response')
        const { edges, pageInfo } = result.data.transactions
        if (!pageInfo || typeof pageInfo.hasNextPage !== 'boolean') throw new Error('Missing pagination information')
        for (const { node } of edges) {
          const event = parseEvent(node)
          if (event && dates.includes(new Date(event.time).toISOString().slice(0, 10))) events.set(event.id, event)
        }
        scanned += edges.length
        onProgress(scanned)
        if (!pageInfo.hasNextPage) return { events: [...events.values()], continuation: null, endpoint }
        const next = edges.at(-1)?.cursor
        if (!next || next === after || seenCursors.has(next)) throw new Error('Query service returned a repeated cursor')
        seenCursors.add(next)
        after = next
      }
      return { events: [...events.values()], continuation: { after, endpoint }, endpoint }
    } catch (error) { lastError = error }
  }
  throw lastError || new Error('Analytics service unavailable')
}
