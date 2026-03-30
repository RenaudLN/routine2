// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

/** A single step / task within a routine */
export interface RoutineStep {
  id: string
  title: string
  description?: string
  /** Duration in seconds (optional) */
  durationSeconds?: number
  order: number
}

/** A user-created routine */
export interface Routine {
  /** Auto-incremented by Dexie; undefined before first save */
  id?: number
  title: string
  description?: string
  steps: RoutineStep[]
  createdAt: Date
  updatedAt: Date
}

/** A log entry recording one completion of a routine */
export interface RoutineLog {
  id?: number
  routineId: number
  completedAt: Date
  /** Optional notes the user adds after completing */
  notes?: string
}
