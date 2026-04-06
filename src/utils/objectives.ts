import dayjs from 'dayjs'
import type { RoutineVersion, Activity } from '../types'

export interface RoutineProgress {
  current: number
  target: number
  isMet: boolean
  periodLabel: string
}

export function getRoutineProgress(
  routine: RoutineVersion,
  activities: Pick<Activity, 'date'>[],
  date: string = dayjs().format('YYYY-MM-DD')
): RoutineProgress {
  const { frequency } = routine
  if (!frequency) {
    return { current: 0, target: 0, isMet: false, periodLabel: '' }
  }

  const d = dayjs(date)
  let periodActivities: Pick<Activity, 'date'>[] = []
  let target = 1
  let periodLabel = ''

  switch (frequency.type) {
    case 'daily':
      periodActivities = activities.filter((a) => a.date === date)
      target = 1
      periodLabel = 'today'
      break
    case 'weekly':
      {
        const startOfWeek = d.startOf('week').format('YYYY-MM-DD')
        const endOfWeek = d.endOf('week').format('YYYY-MM-DD')
        periodActivities = activities.filter(
          (a) => a.date >= startOfWeek && a.date <= endOfWeek
        )
        target = frequency.value || 1
        periodLabel = 'this week'
      }
      break
    case 'monthly':
      {
        const startOfMonth = d.startOf('month').format('YYYY-MM-DD')
        const endOfMonth = d.endOf('month').format('YYYY-MM-DD')
        periodActivities = activities.filter(
          (a) => a.date >= startOfMonth && a.date <= endOfMonth
        )
        target = frequency.value || 1
        periodLabel = 'this month'
      }
      break
    case 'specific_days':
      {
        const isTodayTarget = frequency.days?.includes(d.day())
        periodActivities = activities.filter((a) => a.date === date)
        target = isTodayTarget ? 1 : 0
        periodLabel = 'today'
      }
      break
  }

  const current = periodActivities.length
  const isMet = target > 0 && current >= target

  return { current, target, isMet, periodLabel }
}

export function getConfettiProbability(frequencyType: string): number {
  switch (frequencyType) {
    case 'daily':
    case 'specific_days':
      return 0.25 // 25%
    case 'weekly':
      return 0.5 // 50%
    case 'monthly':
      return 1.0 // 100%
    default:
      return 0
  }
}
