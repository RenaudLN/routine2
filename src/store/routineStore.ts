import Dexie from 'dexie'
import { create } from 'zustand'
import { db } from '../db'
import type { RoutineField, RoutineVersion } from '../types'

/** The shape exposed to the UI: the latest RoutineVersion for each Routine. */
export type RoutineSummary = RoutineVersion

interface RoutineState {
  /** Latest (non-deleted) version for each Routine, ordered by createdAt desc. */
  routines: RoutineSummary[]
  loading: boolean
  error: string | null

  fetchRoutines: () => Promise<void>
  addRoutine: (data: {
    title: string
    description?: string
    fields: RoutineField[]
    frequency?: RoutineVersion['frequency']
    reminders?: RoutineVersion['reminders']
    color?: string
  }) => Promise<number>
  updateRoutine: (
    routineId: number,
    data: {
      title: string
      description?: string
      fields: RoutineField[]
      frequency?: RoutineVersion['frequency']
      reminders?: RoutineVersion['reminders']
      color?: string
    },
  ) => Promise<void>
  deleteRoutine: (routineId: number) => Promise<void>
  /** Returns all versions for a given routineId, ordered by version asc. */
  fetchVersions: (routineId: number) => Promise<RoutineVersion[]>
  /** Returns the latest version for a given routineId, or null if not found. */
  fetchLatestVersion: (routineId: number) => Promise<RoutineVersion | null>
  /** Returns a specific version for a given routineId, or null if not found. */
  fetchSpecificVersion: (routineId: number, version: number) => Promise<RoutineVersion | null>
}

/** Loads all non-deleted latest versions, ordered by createdAt desc. */
async function loadLatestVersions(): Promise<RoutineSummary[]> {
  const all = await db.routineVersions.toArray()
  const filtered = all.filter((v) => {
    const isLatest = v.isLatest === true || (v.isLatest as unknown as number) === 1
    return !!isLatest && v.deletedAt === undefined
  })
  return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

function areOptionsEqual(a?: string[], b?: string[]): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}

function checkIsLightChange(
  current: RoutineVersion,
  newData: {
    title: string
    description?: string
    fields: RoutineField[]
    frequency?: RoutineVersion['frequency']
    reminders?: RoutineVersion['reminders']
    color?: string
  },
): boolean {
  // If fields changed, it's NOT a light change
  if (current.fields.length !== newData.fields.length) return false

  const currentFieldsMap = new Map(current.fields.map((f) => [f.name, f]))

  for (const newField of newData.fields) {
    const currentField = currentFieldsMap.get(newField.name)
    if (!currentField) return false

    if (
      currentField.type !== newField.type ||
      currentField.description !== newField.description ||
      currentField.required !== newField.required ||
      currentField.ratingMax !== newField.ratingMax ||
      !areOptionsEqual(currentField.options, newField.options)
    ) {
      return false
    }
  }

  // Treat title, description, color, frequency, and reminders as light changes.
  return true
}

export function getRandomColor() {
  const hue = Math.floor(Math.random() * 360)
  return `hsl(${hue}, 70%, 50%)`
}

export const useRoutineStore = create<RoutineState>((set) => ({
  routines: [],
  loading: false,
  error: null,

  fetchRoutines: async () => {
    set({ loading: true, error: null })
    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
      const routines = await loadLatestVersions()
      set({ routines, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  addRoutine: async ({ title, description, fields, frequency, reminders, color }) => {
    const now = new Date()
    const routineId = (await db.routines.add({ createdAt: now })) as number
    await db.routineVersions.add({
      routineId,
      version: 1,
      title,
      description,
      fields,
      frequency,
      reminders,
      color: color || getRandomColor(),
      createdAt: now,
      isLatest: true,
    })
    const routines = await loadLatestVersions()
    set({ routines })
    return routineId
  },

  updateRoutine: async (routineId, { title, description, fields, frequency, reminders, color }) => {
    if (!routineId) throw new Error('Routine ID is required for updating')
    const now = new Date()
    await db.transaction('rw', db.routineVersions, async () => {
      const current = await db.routineVersions
        .where('[routineId+version]')
        .between([routineId, Dexie.minKey], [routineId, Dexie.maxKey])
        .last()
      if (!current) throw new Error(`No version found for routineId ${routineId}`)

      const isLightChange = checkIsLightChange(current, {
        title,
        description,
        fields,
        frequency,
        reminders,
        color,
      })

      if (isLightChange) {
        await db.routineVersions.update(current.id!, {
          title,
          description,
          fields,
          frequency,
          reminders,
          color,
        })
      } else {
        await db.routineVersions.update(current.id!, {
          isLatest: false,
        })
        await db.routineVersions.add({
          routineId,
          version: current.version + 1,
          title,
          description,
          fields,
          frequency,
          reminders,
          color: color || current.color,
          createdAt: now,
          isLatest: true,
        })
      }
    })
    const routines = await loadLatestVersions()
    set({ routines })
  },

  deleteRoutine: async (routineId) => {
    if (!routineId) return
    const latest = await db.routineVersions
      .where('[routineId+version]')
      .between([routineId, Dexie.minKey], [routineId, Dexie.maxKey])
      .last()
    if (latest?.id) {
      await db.routineVersions.update(latest.id, { deletedAt: new Date() })
    }
    const routines = await loadLatestVersions()
    set({ routines })
  },

  fetchVersions: async (routineId) => {
    if (!routineId) return []
    return db.routineVersions
      .where('[routineId+version]')
      .between([routineId, Dexie.minKey], [routineId, Dexie.maxKey])
      .toArray()
  },

  fetchSpecificVersion: async (routineId, versionNum) => {
    if (!routineId || !versionNum) return null
    const version = await db.routineVersions
      .where('[routineId+version]')
      .equals([routineId, versionNum])
      .first()
    return version ?? null
  },

  fetchLatestVersion: async (routineId) => {
    if (!routineId) return null
    const version = await db.routineVersions
      .where('[routineId+version]')
      .between([routineId, Dexie.minKey], [routineId, Dexie.maxKey])
      .last()
    return version ?? null
  },
}))
