/// <reference lib="webworker" />
import { db } from './db'
import { getRoutineProgress } from './utils/objectives'

interface ManifestEntry {
  url: string
  revision: string | null
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string
}

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | ManifestEntry)[]
}

const CACHE_NAME = 'routine-tracker-v1'

// Precache and route all manifest assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const assets = self.__WB_MANIFEST.map((entry) =>
        typeof entry === 'string' ? entry : entry.url
      )
      // Filter out any assets that might not be found or are external
      return cache.addAll(assets.filter(url => !url.startsWith('http')))
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
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // For navigation requests, try to serve index.html from cache (SPA support)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/routine2/index.html').then((response) => {
        return response || fetch(request)
      })
    )
    return
  }

  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request)
    })
  )
})

async function checkAndShowReminders() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`
  const currentTimeStr = now.toTimeString().slice(0, 5) // HH:mm

  try {
    const routines = await db.routineVersions
      .filter((v) => !!v.isLatest && !v.deletedAt)
      .toArray()

    const pendingReminders = []

    for (const routine of routines) {
      if (!routine.reminders || routine.reminders.length === 0) continue

      const activities = await db.activities
        .where('routineId')
        .equals(routine.routineId)
        .toArray()

      const progress = getRoutineProgress(routine, activities, todayStr)
      if (progress.isMet) continue

      for (const reminder of routine.reminders) {
        // If the reminder time has passed or is now
        if (reminder.time <= currentTimeStr) {
          // Check if we already notified for this today
          const alreadyNotified = await db.notificationLogs
            .where('[routineId+reminderId+date]')
            .equals([routine.routineId, reminder.id, todayStr])
            .first()

          if (!alreadyNotified) {
            pendingReminders.push({ routine, reminder })
          }
        }
      }
    }

    if (pendingReminders.length === 0) return

    let title: string
    let body: string
    let url: string

    if (pendingReminders.length === 1) {
      const { routine } = pendingReminders[0]
      title = routine.title
      body = `It's time for your "${routine.title}" routine!`
      url = `/routine2/routines/${routine.routineId}/record`
    } else {
      title = `${pendingReminders.length} Routine Reminders`
      const routineTitles = pendingReminders.map(p => p.routine.title).join(', ')
      body = `It's time for your routines: ${routineTitles}`
      url = '/routine2/'
    }

    await self.registration.showNotification(title, {
      body,
      icon: '/routine2/pwa-192.png',
      badge: '/routine2/favicon.svg',
      data: { url },
    })

    for (const { routine, reminder } of pendingReminders) {
      await db.notificationLogs.add({
        routineId: routine.routineId,
        reminderId: reminder.id,
        date: todayStr,
        shownAt: new Date(),
      })
    }
  } catch (err) {
    console.error('Service worker reminder check failed:', err)
  }
}

// @ts-expect-error periodicsync is not standard yet
self.addEventListener('periodicsync', (event: PeriodicSyncEvent) => {
  if (event.tag === 'reminder-sync') {
    event.waitUntil(checkAndShowReminders())
  }
})

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const urlToOpen = event.notification.data.url || '/routine2/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})
