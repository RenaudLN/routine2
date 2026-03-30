import Dexie, { type EntityTable } from 'dexie'
import type { Routine, RoutineVersion, Activity } from '../types'

class RoutineDatabase extends Dexie {
  routines!: EntityTable<Routine, 'id'>
  routineVersions!: EntityTable<RoutineVersion, 'id'>
  activities!: EntityTable<Activity, 'id'>

  constructor() {
    super('RoutineTrackerDB')

    // v1 kept so Dexie can upgrade existing installations cleanly.
    this.version(1).stores({
      routines: '++id, title, createdAt, updatedAt',
      logs: '++id, routineId, completedAt',
    })

    // v2 drops the old tables.
    this.version(2)
      .stores({
        routines: null,
        logs: null,
      })
      .upgrade(() => {
        // Nothing to migrate - old data is discarded.
      })

    // v3 introduces the new schema.
    this.version(3).stores({
      routines: '++id, createdAt',
      routineVersions: '++id, routineId, [routineId+version], isLatest, deletedAt',
      activities: '++id, routineId, [routineId+date], date, status',
    })
  }
}

export const db = new RoutineDatabase()
