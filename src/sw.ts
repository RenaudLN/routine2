/// <reference lib="webworker" />
import { db } from './db'

interface ManifestEntry {
  url: string
  revision: string | null
}

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | ManifestEntry)[]
}

const CACHE_NAME = 'routine-tracker-v1'

// Precache and route all manifest assets (Vanilla version)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const assets = self.__WB_MANIFEST.map((entry) =>
        typeof entry === 'string' ? entry : entry.url
      )
      return cache.addAll(assets)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})

async function checkAndShowReminders() {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const currentTimeStr = now.toTimeString().slice(0, 5) // HH:mm

  try {
    // 1. Get all latest (active) routine versions
    const routines = await db.routineVersions
      .filter((v) => !!v.isLatest && !v.deletedAt)
      .toArray()

    for (const routine of routines) {
      if (!routine.reminders || routine.reminders.length === 0) continue

      // 2. Check if already completed today
      const activity = await db.activities
        .where('[routineId+date]')
        .equals([routine.routineId, todayStr])
        .first()

      if (activity?.status === 'complete') continue

      // 3. Find if any reminder time matches "now" (approximately)
      // or if it passed recently (within the last hour) and we haven't notified.
      // For simplicity in a local SW, we'll just fire if ANY reminder matches the current hour/minute.
      for (const reminder of routine.reminders) {
        if (reminder.time === currentTimeStr) {
          await self.registration.showNotification(routine.title, {
            body: `It's time for your "${routine.title}" routine!`,
            icon: '/routine2/pwa-192.png',
            badge: '/routine2/favicon.svg',
            data: { url: `/routine2/routines/${routine.routineId}/record` },
          })
        }
      }
    }
  } catch (err) {
    console.error('Service worker reminder check failed:', err)
  }
}

// Handle periodic sync
// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.addEventListener('periodicsync' as any, (event: any) => {
  if (event.tag === 'reminder-sync') {
    event.waitUntil(checkAndShowReminders())
  }
})

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Routine Reminder'
  const options = {
    body: data.body || "It's time for your routine!",
    icon: '/routine2/pwa-192.png',
    badge: '/routine2/favicon.svg',
    data: {
      url: data.url || '/routine2/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const urlToOpen = event.notification.data.url || '/routine2/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})
