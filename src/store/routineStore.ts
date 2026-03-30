import { create } from 'zustand'
import { db } from '../db'
import type { Routine, RoutineStep } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoutineState {
  routines: Routine[]
  loading: boolean
  error: string | null

  // Actions
  fetchRoutines: () => Promise<void>
  addRoutine: (data: { title: string; description?: string; steps: RoutineStep[] }) => Promise<number>
  updateRoutine: (id: number, data: Partial<Omit<Routine, 'id' | 'createdAt'>>) => Promise<void>
  deleteRoutine: (id: number) => Promise<void>
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRoutineStore = create<RoutineState>((set) => ({
  routines: [],
  loading: false,
  error: null,

  fetchRoutines: async () => {
    set({ loading: true, error: null })
    try {
      const routines = await db.routines.orderBy('createdAt').reverse().toArray()
      set({ routines, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  addRoutine: async ({ title, description, steps }) => {
    const now = new Date()
    const id = await db.routines.add({
      title,
      description,
      steps,
      createdAt: now,
      updatedAt: now,
    })
    // Refresh list
    const routines = await db.routines.orderBy('createdAt').reverse().toArray()
    set({ routines })
    return id as number
  },

  updateRoutine: async (id, data) => {
    await db.routines.update(id, { ...data, updatedAt: new Date() })
    const routines = await db.routines.orderBy('createdAt').reverse().toArray()
    set({ routines })
  },

  deleteRoutine: async (id) => {
    await db.routines.delete(id)
    // Also remove associated logs
    await db.logs.where('routineId').equals(id).delete()
    const routines = await db.routines.orderBy('createdAt').reverse().toArray()
    set({ routines })
  },
}))
