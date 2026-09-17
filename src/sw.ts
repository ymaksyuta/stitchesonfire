/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

/**
 * PDF export download relay.
 *
 * Downloading a client-generated Blob normally means an `<a download>`
 * click on a `blob:` URL. That's fine in a regular tab, but installed
 * Firefox PWA windows appear to ignore the `download` attribute for
 * `blob:` URLs and just navigate the app itself there (which it can't
 * render — a black screen), and `window.open()` from inside an installed
 * PWA doesn't reliably escape to a real browser tab either (it tends to
 * stay inside the app, per browser vendors' own PWA issue trackers).
 *
 * A real network response with a `Content-Disposition: attachment`
 * header is honored by the browser's download manager regardless of
 * what kind of window asked for it, because it's the same mechanism
 * used for downloading any ordinary file from a server. So: the page
 * posts the finished PDF blob to this worker, then opens a matching
 * same-origin URL in a new tab; this fetch handler intercepts that
 * navigation and answers it as a downloadable attachment instead of
 * letting it reach the network.
 *
 * The blob is stashed in the Cache Storage API, not a plain module-level
 * variable — browsers (Firefox especially) can terminate an idle service
 * worker instance between events, and any state sitting in top-level
 * variables is wiped when that happens. A moment's gap between the
 * postMessage and the new tab's fetch is enough to hit this, which is
 * why "export expired" could still fire even though the SW correctly
 * received the blob moments earlier. Cache Storage persists across a
 * worker restart the same way IndexedDB would.
 */
const EXPORT_CACHE = 'pdf-export-v1'

function exportDataKey(id: string) {
  return `/__export-data/${id}`
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data
  if (data?.type !== 'export-pdf') return

  const port = event.ports[0]
  event.waitUntil(
    caches
      .open(EXPORT_CACHE)
      .then((cache) => cache.put(exportDataKey(data.id), new Response(data.blob as Blob)))
      .then(() => port?.postMessage({ type: 'export-pdf-ack' })),
  )
})

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url)
  const match = url.pathname.match(/^\/__export\/([^/]+)\.pdf$/)
  if (!match) return

  const [, id] = match

  event.respondWith(
    (async () => {
      const cache = await caches.open(EXPORT_CACHE)
      const key = exportDataKey(id)
      const cached = await cache.match(key)
      if (!cached) {
        return new Response('Export expired, please try again.', { status: 404 })
      }
      const blob = await cached.blob()
      await cache.delete(key)

      // HTTP header values must be ASCII (ByteString) — the Response
      // constructor throws on anything outside that range, which is
      // exactly what happened for pattern names containing Cyrillic.
      // `name` arrives already percent-encoded (see exportPdf.ts), so
      // it's ASCII-safe as-is for the RFC 5987 `filename*` form; the
      // plain `filename` fallback (for older clients) gets a
      // decoded-then-ASCII-sanitized copy.
      const encodedName = url.searchParams.get('name') ?? 'pattern.pdf'
      let asciiName = 'pattern.pdf'
      try {
        asciiName = decodeURIComponent(encodedName).replace(/[^\x20-\x7e]/g, '_') || 'pattern.pdf'
      } catch {
        // Malformed percent-encoding — fall back to the default name.
      }

      return new Response(blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
          'Cache-Control': 'no-store',
        },
      })
    })(),
  )
})
