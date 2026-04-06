import { describe, it, expect } from 'vitest'
import { getRoutineProgress } from './objectives'
import { RoutineVersion, Activity } from '../types'

describe('getRoutineProgress', () => {
  const routineBase: Partial<RoutineVersion> = {
    id: 1,
    routineId: 1,
    version: 1,
    title: 'Test Routine',
    fields: [],
    createdAt: new Date(),
    isLatest: true,
  }

  it('handles daily frequency with unique days', () => {
    const routine: RoutineVersion = {
      ...routineBase as RoutineVersion,
      frequency: { type: 'daily' },
    }
    const activities: Pick<Activity, 'date' | 'routineId'>[] = [
      { date: '2023-10-10', routineId: 1 },
      { date: '2023-10-10', routineId: 1 }, // Duplicate
    ]
    
    // Met today
    expect(getRoutineProgress(routine, activities, '2023-10-10')).toMatchObject({
      current: 1, // Only counts once
      target: 1,
      isMet: true,
      periodLabel: 'today',
    })

    // Not met today
    expect(getRoutineProgress(routine, activities, '2023-10-11')).toMatchObject({
      current: 0,
      target: 1,
      isMet: false,
      periodLabel: 'today',
    })
  })

  it('counts unique days for weekly frequency', () => {
    const routine: RoutineVersion = {
      ...routineBase as RoutineVersion,
      frequency: { type: 'weekly', value: 2 },
    }
    const activities: Pick<Activity, 'date' | 'routineId'>[] = [
      { date: '2023-10-09', routineId: 1 }, // Monday
      { date: '2023-10-09', routineId: 1 }, // Monday again (same day)
    ]
    
    // Unique days count
    const progress = getRoutineProgress(routine, activities, '2023-10-10')
    expect(progress.current).toBe(1)
    expect(progress.target).toBe(2)
    expect(progress.isMet).toBe(false)

    // Add another day
    const moreActivities = [...activities, { date: '2023-10-10', routineId: 1 }]
    const updatedProgress = getRoutineProgress(routine, moreActivities, '2023-10-10')
    expect(updatedProgress.current).toBe(2)
    expect(updatedProgress.isMet).toBe(true)
  })

  it('filters activities by routineId', () => {
    const routine: RoutineVersion = {
      ...routineBase as RoutineVersion,
      routineId: 1,
      frequency: { type: 'daily' },
    }
    const activities: Pick<Activity, 'date' | 'routineId'>[] = [
      { date: '2023-10-10', routineId: 2 }, // Different routine
    ]
    
    const progress = getRoutineProgress(routine, activities, '2023-10-10')
    expect(progress.current).toBe(0)
    expect(progress.isMet).toBe(false)
  })

  it('handles monthly frequency with unique days', () => {
    const routine: RoutineVersion = {
      ...routineBase as RoutineVersion,
      frequency: { type: 'monthly', value: 2 },
    }
    const activities: Pick<Activity, 'date' | 'routineId'>[] = [
      { date: '2023-10-01', routineId: 1 },
      { date: '2023-10-01', routineId: 1 }, // Same day
      { date: '2023-10-31', routineId: 1 },
    ]

    const progress = getRoutineProgress(routine, activities, '2023-10-15')
    expect(progress.current).toBe(2) // Oct 1st and Oct 31st
    expect(progress.isMet).toBe(true)
  })

  it('handles specific_days frequency', () => {
    const routine: RoutineVersion = {
      ...routineBase as RoutineVersion,
      frequency: { type: 'specific_days', days: [1, 3, 5] }, // Mon, Wed, Fri
    }
    const activities: Pick<Activity, 'date' | 'routineId'>[] = [
      { date: '2023-10-09', routineId: 1 }, // Monday
      { date: '2023-10-09', routineId: 1 }, // Monday duplicate
    ]

    // On a target day (Monday)
    expect(getRoutineProgress(routine, activities, '2023-10-09')).toMatchObject({
      current: 1,
      target: 1,
      isMet: true,
    })

    // On a target day but not done (Wednesday)
    expect(getRoutineProgress(routine, activities, '2023-10-11')).toMatchObject({
      current: 0,
      target: 1,
      isMet: false,
    })

    // On a non-target day (Tuesday)
    expect(getRoutineProgress(routine, activities, '2023-10-10')).toMatchObject({
      current: 0,
      target: 0,
      isMet: false,
    })
  })
})
