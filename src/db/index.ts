import Dexie, { type EntityTable } from 'dexie'
import type { Routine, RoutineLog } from '../types'

// ---------------------------------------------------------------------------
// Database definition
// ---------------------------------------------------------------------------

class RoutineDatabase extends Dexie {
  routines!: EntityTable<Routine, 'id'>
  logs!: EntityTable<RoutineLog, 'id'>

  constructor() {
    super('RoutineTrackerDB')

    this.version(1).stores({
      // Index the fields we'll query on.
      // 'steps' is a JSON blob — Dexie stores it as-is, no index needed.
      routines: '++id, title, createdAt, updatedAt',
      logs: '++id, routineId, completedAt',
    })
  }
}

export const db = new RoutineDatabase()
