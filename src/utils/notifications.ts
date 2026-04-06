import { db } from '../db'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications.')
    return false
  }

  try {
    const permission = Notification.permission
    if (permission === 'granted') return true
    
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

export async function registerPeriodicSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    // Check for periodic sync support
    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({
        // @ts-expect-error - periodic-background-sync is not in all type definitions
        name: 'periodic-background-sync',
      })

      if (status.state === 'granted') {
        // @ts-expect-error - periodicSync is not in all type definitions
        await registration.periodicSync.register('reminder-sync', {
          minInterval: 15 * 60 * 1000, // Try to sync every 15 minutes
        })
        console.log('Periodic background sync registered')
      }
    }
  } catch (error) {
    console.error('Periodic background sync registration failed:', error)
  }
}

export async function registerPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) return subscription

    // Note: This requires a VAPID key to actually work for real push.
    // return await registration.pushManager.subscribe({ userVisibleOnly: true })
    return null
  } catch (error) {
    console.error('Error getting push subscription:', error)
    return null
  }
}

export async function showLocalNotification(
  title: string, 
  body: string, 
  url = '/routine2/',
  routineId?: number,
  reminderId?: string
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  // If we have routine/reminder info, check if already notified today
  if (routineId !== undefined && reminderId !== undefined) {
    const alreadyNotified = await db.notificationLogs
      .where('[routineId+reminderId+date]')
      .equals([routineId, reminderId, todayStr])
      .first()
    
    if (alreadyNotified) return
  }

  const options = {
    body,
    icon: '/routine2/pwa-192.png',
    badge: '/routine2/favicon.svg',
    data: { url },
  }

  // Use service worker to show notification if possible (works better in background)
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, options)
  } else {
    // Fallback to simple Notification
    new Notification(title, options)
  }

  // Log it
  if (routineId !== undefined && reminderId !== undefined) {
    await db.notificationLogs.add({
      routineId,
      reminderId,
      date: todayStr,
      shownAt: new Date(),
    })
  }
}
