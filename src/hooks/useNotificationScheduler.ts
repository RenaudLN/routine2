import { useEffect, useRef } from 'react'
import { useRoutineStore } from '../store/routineStore'
import { showLocalNotifications, type NotificationItem } from '../utils/notifications'

export function useNotificationScheduler() {
  const { routines } = useRoutineStore()
  const timers = useRef<number[]>([])

  useEffect(() => {
    // Clear old timers
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []

    const now = new Date()
    const currentTimeStr = now.toTimeString().slice(0, 5)

    // Group reminders by time
    const remindersByTime = new Map<string, NotificationItem[]>()

    routines.forEach((routine) => {
      if (!routine.reminders) return

      routine.reminders.forEach((reminder) => {
        const item: NotificationItem = {
          title: routine.title,
          body: `It's time for your "${routine.title}" routine!`,
          url: `/routine2/routines/${routine.routineId}/record`,
          routineId: routine.routineId,
          reminderId: reminder.id
        }

        if (!remindersByTime.has(reminder.time)) {
          remindersByTime.set(reminder.time, [])
        }
        remindersByTime.get(reminder.time)!.push(item)
      })
    })

    // Process grouped reminders
    remindersByTime.forEach((items, time) => {
      const [h, m] = time.split(':').map(Number)
      
      // Calculate when this reminder should fire today
      const target = new Date()
      target.setHours(h, m, 0, 0)

      const diff = target.getTime() - now.getTime()

      // If it's in the future
      if (diff > 0) {
        const timerId = window.setTimeout(() => {
          void showLocalNotifications(items)
        }, diff)

        timers.current.push(timerId)
      } else if (time <= currentTimeStr) {
        // It was earlier today. Check if we missed it and show if needed.
        // We only do this if it's within a reasonable window (e.g., today)
        // showLocalNotifications already checks the DB so it won't duplicate.
        void showLocalNotifications(items)
      }
    })

    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [routines])
}
