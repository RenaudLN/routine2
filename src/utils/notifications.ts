import { db } from '../db'
import { getRoutineProgress } from './objectives'

export interface NotificationItem {
  title: string
  body: string
  url: string
  routineId?: number
  reminderId?: string
}

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
  return showLocalNotifications([{ title, body, url, routineId, reminderId }])
}

export async function showLocalNotifications(items: NotificationItem[]) {
  if (items.length === 0) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  const pendingItems: NotificationItem[] = []

  for (const item of items) {
    if (item.routineId !== undefined && item.reminderId !== undefined) {
      const alreadyNotified = await db.notificationLogs
        .where('[routineId+reminderId+date]')
        .equals([item.routineId, item.reminderId, todayStr])
        .first()
      
      if (alreadyNotified) continue

      const routine = await db.routineVersions
        .where('routineId')
        .equals(item.routineId)
        .filter((v) => !!v.isLatest && !v.deletedAt)
        .first()
      
      if (routine) {
        const activities = await db.activities
          .where('routineId')
          .equals(item.routineId)
          .toArray()
        
        const progress = getRoutineProgress(routine, activities, todayStr)
        if (progress.isMet) {
          continue
        }
      }
    }
    pendingItems.push(item)
  }

  if (pendingItems.length === 0) return

  let title: string
  let body: string
  let url: string

  if (pendingItems.length === 1) {
    const item = pendingItems[0]
    title = item.title
    body = item.body
    url = item.url
  } else {
    title = `${pendingItems.length} Routine Reminders`
    const routineTitles = pendingItems.map(i => i.title).join(', ')
    body = `It's time for your routines: ${routineTitles}`
    url = '/routine2/'
  }

  const options = {
    body,
    icon: '/routine2/pwa-192.png',
    badge: '/routine2/favicon.svg',
    data: { url },
  }

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, options)
  } else {
    new Notification(title, options)
  }

  // Log all
  for (const item of pendingItems) {
    if (item.routineId !== undefined && item.reminderId !== undefined) {
      await db.notificationLogs.add({
        routineId: item.routineId,
        reminderId: item.reminderId,
        date: todayStr,
        shownAt: new Date(),
      })
    }
  }
}
