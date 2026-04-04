import { useEffect, useRef } from 'react'
import { useRoutineStore } from '../store/routineStore'
import { showLocalNotification } from '../utils/notifications'

export function useNotificationScheduler() {
  const { routines } = useRoutineStore()
  const timers = useRef<number[]>([])
  const notifiedReminders = useRef<Set<string>>(new Set()) // routineId-time

  useEffect(() => {
    // Clear old timers
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []

    const now = new Date()

    routines.forEach((routine) => {
      if (!routine.reminders) return

      routine.reminders.forEach((reminder) => {
        const [h, m] = reminder.time.split(':').map(Number)
        
        // Calculate when this reminder should fire today
        const target = new Date()
        target.setHours(h, m, 0, 0)

        const diff = target.getTime() - now.getTime()

        // If it's in the future (within the next 24 hours)
        if (diff > 0) {
          const reminderKey = `${routine.routineId}-${reminder.time}-${target.toDateString()}`
          
          const timerId = window.setTimeout(() => {
            if (!notifiedReminders.current.has(reminderKey)) {
              showLocalNotification(
                routine.title,
                `It's time for your "${routine.title}" routine!`,
                `/routine2/routines/${routine.routineId}/record`
              )
              notifiedReminders.current.add(reminderKey)
            }
          }, diff)

          timers.current.push(timerId)
        }
      })
    })

    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [routines])
}
