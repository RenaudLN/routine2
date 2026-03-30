import { create } from 'zustand'
import { db } from '../db'
import type { Activity, FieldValue } from '../types'

/** Returns today's date as an ISO date string YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

interface ActivityState {
  /** Activities currently loaded in memory (for the active view). */
  activities: Activity[]
  loading: boolean
  error: string | null

  /** Load all activities for a given routineId, ordered by date desc. */
  fetchActivitiesByRoutine: (routineId: number) => Promise<void>

  /** Load all activities for a given date (YYYY-MM-DD), ordered by routineId. */
  fetchActivitiesByDate: (date: string) => Promise<void>

  /**
   * Create a new Activity (draft or complete).
   * date defaults to today if omitted.
   * Returns the new activity id.
   */
  addActivity: (data: {
    routineId: number
    routineVersion: number
    date?: string
    status: 'draft' | 'complete'
    fieldValues: FieldValue[]
  }) => Promise<number>

  /** Update an existing Activity's field values and/or status. Bumps updatedAt. */
  updateActivity: (
    id: number,
    data: Partial<Pick<Activity, 'fieldValues' | 'status' | 'date'>>,
  ) => Promise<void>

  /** Hard-delete an Activity. */
  deleteActivity: (id: number) => Promise<void>
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  loading: false,
  error: null,

  fetchActivitiesByRoutine: async (routineId) => {
    set({ loading: true, error: null })
    try {
      const activities = await db.activities
        .where('routineId')
        .equals(routineId)
        .reverse()
        .sortBy('date')
      set({ activities, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  fetchActivitiesByDate: async (date) => {
    set({ loading: true, error: null })
    try {
      const activities = await db.activities
        .where('date')
        .equals(date)
        .sortBy('routineId')
      set({ activities, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  addActivity: async ({ routineId, routineVersion, date, status, fieldValues }) => {
    const now = new Date()
    const id = (await db.activities.add({
      routineId,
      routineVersion,
      date: date ?? todayISO(),
      status,
      fieldValues,
      createdAt: now,
      updatedAt: now,
    })) as number
    return id
  },

  updateActivity: async (id, data) => {
    await db.activities.update(id, { ...data, updatedAt: new Date() })
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...data, updatedAt: new Date() } : a,
      ),
    }))
  },

  deleteActivity: async (id) => {
    await db.activities.delete(id)
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
    }))
  },
}))
