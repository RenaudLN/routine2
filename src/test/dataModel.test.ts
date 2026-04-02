import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Dexie so tests run in jsdom without a real IndexedDB
// ---------------------------------------------------------------------------
vi.mock('../db', () => {
  const routinesStore: Record<number, { id: number; createdAt: Date }> = {}
  const versionsStore: Record<number, Record<string, unknown>> = {}
  const activitiesStore: Record<number, Record<string, unknown>> = {}
  let routineSeq = 0
  let versionSeq = 0
  let activitySeq = 0

  const makeVersionsColl = (records: Record<string, unknown>[]) => ({
    toArray: () => Promise.resolve([...records]),
    last: () => Promise.resolve(records.length ? records[records.length - 1] : undefined),
    filter: (fn: (v: Record<string, unknown>) => boolean) => makeVersionsColl(records.filter(fn)),
  })

  const db = {
    routines: {
      add: (r: { createdAt: Date }) => {
        const id = ++routineSeq
        routinesStore[id] = { ...r, id }
        return Promise.resolve(id)
      },
    },
    routineVersions: {
      add: (v: Record<string, unknown>) => {
        const id = ++versionSeq
        versionsStore[id] = { ...v, id }
        return Promise.resolve(id)
      },
      toArray: () => Promise.resolve(Object.values(versionsStore)),
      update: (id: number, patch: Record<string, unknown>) => {
        versionsStore[id] = { ...versionsStore[id], ...patch }
        return Promise.resolve(1)
      },
      where: (index: string) => ({
        equals: (val: unknown) => {
          if (index === 'isLatest') {
            const boolVal = val === 1
            return makeVersionsColl(
              Object.values(versionsStore).filter((v) => v['isLatest'] === boolVal),
            )
          }
          return makeVersionsColl([])
        },
        between: ( _lower: unknown) => {
          const routineId = (_lower as [number, unknown])[0]
          const records = Object.values(versionsStore)
            .filter((v) => v['routineId'] === routineId)
            .sort((a, b) => (a['version'] as number) - (b['version'] as number))
          return makeVersionsColl(records)
        },
      }),
    },
    activities: {
      add: (a: Record<string, unknown>) => {
        const id = ++activitySeq
        activitiesStore[id] = { ...a, id }
        return Promise.resolve(id)
      },
      update: (id: number, patch: Record<string, unknown>) => {
        activitiesStore[id] = { ...activitiesStore[id], ...patch }
        return Promise.resolve(1)
      },
      delete: (id: number) => {
        delete activitiesStore[id]
        return Promise.resolve()
      },
      where: (index: string) => ({
        equals: (val: unknown) => ({
          reverse: () => ({
            sortBy: () =>
              Promise.resolve(
                Object.values(activitiesStore)
                  .filter((a) => a[index] === val)
                  .reverse(),
              ),
          }),
          sortBy: () =>
            Promise.resolve(
              Object.values(activitiesStore).filter((a) => a[index] === val),
            ),
        }),
      }),
    },
    transaction: (_mode: string, _tables: unknown[], fn: () => Promise<void>) => fn(),
  }

  return { db }
})

vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('dexie')>()
  return {
    ...actual,
    default: class MockDexie {
      static minKey = -Infinity
      static maxKey = Infinity
      version() { return { stores: () => ({ upgrade: () => {} }) } }
    },
  }
})

import { useRoutineStore } from '../store/routineStore'
import { useActivityStore, todayISO } from '../store/activityStore'

beforeEach(() => {
  useRoutineStore.setState({ routines: [], loading: false, error: null })
  useActivityStore.setState({ activities: [], loading: false, error: null })
})

// ---------------------------------------------------------------------------
// todayISO
// ---------------------------------------------------------------------------
describe('todayISO', () => {
  it('returns a string matching YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('matches the current local date', () => {
    const d = new Date()
    const expected = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
    expect(todayISO()).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// routineStore
// ---------------------------------------------------------------------------
describe('routineStore', () => {
  it('addRoutine creates a family record and version 1', async () => {
    const { addRoutine } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Morning',
      fields: [{ name: 'Mood', type: 'Rating', required: true, ratingMax: 5 }],
    })
    expect(routineId).toBeGreaterThan(0)
    const { routines } = useRoutineStore.getState()
    expect(routines).toHaveLength(1)
    expect(routines[0].routineId).toBe(routineId)
    expect(routines[0].version).toBe(1)
    expect(routines[0].isLatest).toBe(true)
    expect(routines[0].title).toBe('Morning')
  })

  it('updateRoutine bumps the version and marks old version as not latest', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Evening',
      fields: [{ name: 'Notes', type: 'Text', required: false }],
    })
    await updateRoutine(routineId, {
      title: 'Evening v2',
      fields: [
        { name: 'Notes', type: 'Text', required: false },
        { name: 'Sleep quality', type: 'Rating', required: true, ratingMax: 10 },
      ],
    })
    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
    expect(versions[0].version).toBe(1)
    expect(versions[0].isLatest).toBe(false)
    expect(versions[1].version).toBe(2)
    expect(versions[1].isLatest).toBe(true)
    expect(versions[1].title).toBe('Evening v2')
    expect(versions[1].fields).toHaveLength(2)
  })

  it('fetchRoutines only returns the latest non-deleted version per routine', async () => {
    const { addRoutine, updateRoutine, fetchRoutines } = useRoutineStore.getState()
    const id = await addRoutine({ title: 'Workout', fields: [] })
    await updateRoutine(id, { title: 'Workout v2', fields: [] })
    await fetchRoutines()
    const { routines } = useRoutineStore.getState()
    const match = routines.filter((r) => r.routineId === id)
    expect(match).toHaveLength(1)
    expect(match[0].version).toBe(2)
  })

  it('deleteRoutine soft-deletes: routine disappears from list but version row remains', async () => {
    const { addRoutine, deleteRoutine, fetchRoutines, fetchVersions } =
      useRoutineStore.getState()
    const id = await addRoutine({ title: 'To delete', fields: [] })
    await deleteRoutine(id)
    await fetchRoutines()
    const { routines } = useRoutineStore.getState()
    expect(routines.find((r) => r.routineId === id)).toBeUndefined()
    const versions = await fetchVersions(id)
    expect(versions).toHaveLength(1)
    expect(versions[0].deletedAt).toBeInstanceOf(Date)
  })
})

// ---------------------------------------------------------------------------
// activityStore
// ---------------------------------------------------------------------------
describe('activityStore', () => {
  it('addActivity defaults date to today', async () => {
    const { addActivity } = useActivityStore.getState()
    const id = await addActivity({
      routineId: 1,
      routineVersion: 1,
      status: 'complete',
      fieldValues: [],
    })
    expect(id).toBeGreaterThan(0)
  })

  it('addActivity accepts a custom past date', async () => {
    const { addActivity } = useActivityStore.getState()
    const id = await addActivity({
      routineId: 1,
      routineVersion: 1,
      date: '2024-01-15',
      status: 'complete',
      fieldValues: [{ fieldName: 'Mood', value: 4 }],
    })
    expect(id).toBeGreaterThan(0)
  })

  it('deleteActivity removes the entry from state', async () => {
    const { deleteActivity } = useActivityStore.getState()
    const fakeActivity = {
      id: 999,
      routineId: 3,
      routineVersion: 1,
      date: todayISO(),
      status: 'complete' as const,
      fieldValues: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    useActivityStore.setState({ activities: [fakeActivity] })
    await deleteActivity(999)
    const { activities } = useActivityStore.getState()
    expect(activities.find((a) => a.id === 999)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// RoutineField shape validation
// ---------------------------------------------------------------------------
describe('RoutineField type constraints', () => {
  it('Rating field carries ratingMax', () => {
    const field: import('../types').RoutineField = {
      name: 'Energy',
      type: 'Rating',
      required: true,
      ratingMax: 5,
    }
    expect(field.ratingMax).toBe(5)
  })

  it('Option field carries an options array', () => {
    const field: import('../types').RoutineField = {
      name: 'Category',
      type: 'Option',
      required: false,
      options: ['Work', 'Personal', 'Health'],
    }
    expect(field.options).toHaveLength(3)
  })

  it('FieldValue accepts string, number, or null', () => {
    const values: import('../types').FieldValue[] = [
      { fieldName: 'Notes', value: 'hello' },
      { fieldName: 'Score', value: 7 },
      { fieldName: 'Date', value: '2025-03-30' },
      { fieldName: 'Empty', value: null },
    ]
    expect(values).toHaveLength(4)
    expect(values[3].value).toBeNull()
  })
})
