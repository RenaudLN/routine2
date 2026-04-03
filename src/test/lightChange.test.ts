import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Dexie so tests run in jsdom without a real IndexedDB
// (Copied from dataModel.test.ts)
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
    first: () => Promise.resolve(records.length ? records[0] : undefined),
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
          if (index === '[routineId+version]') {
            const [routineId, version] = val as [number, number]
            return makeVersionsColl(
              Object.values(versionsStore).filter((v) => v['routineId'] === routineId && v['version'] === version),
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
// import { RoutineField } from '../types'

beforeEach(() => {
  useRoutineStore.setState({ routines: [], loading: false, error: null })
})

describe('Routine Light Changes', () => {
  it('updates title and description in place', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Original Title',
      description: 'Original Description',
      fields: [{ name: 'Field 1', type: 'Text', required: true }],
    })

    await updateRoutine(routineId, {
      title: 'New Title',
      description: 'New Description',
      fields: [{ name: 'Field 1', type: 'Text', required: true }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(1)
    expect(versions[0].version).toBe(1)
    expect(versions[0].title).toBe('New Title')
    expect(versions[0].description).toBe('New Description')
  })

  it('updates field order in place', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [
        { name: 'A', type: 'Text', required: false },
        { name: 'B', type: 'Text', required: false },
      ],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [
        { name: 'B', type: 'Text', required: false },
        { name: 'A', type: 'Text', required: false },
      ],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(1)
    expect(versions[0].fields[0].name).toBe('B')
    expect(versions[0].fields[1].name).toBe('A')
  })

  it('updates summary fields in place', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false, showOnSummaryCard: false }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false, showOnSummaryCard: true }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(1)
    expect(versions[0].fields[0].showOnSummaryCard).toBe(true)
  })

  it('combines light changes and still updates in place', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Original Title',
      fields: [
        { name: 'A', type: 'Text', required: false, showOnSummaryCard: false },
        { name: 'B', type: 'Rating', required: true, ratingMax: 5 },
      ],
    })

    await updateRoutine(routineId, {
      title: 'New Title',
      description: 'New Description',
      fields: [
        { name: 'B', type: 'Rating', required: true, ratingMax: 5, showOnSummaryCard: true },
        { name: 'A', type: 'Text', required: false, showOnSummaryCard: true },
      ],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(1)
    expect(versions[0].title).toBe('New Title')
    expect(versions[0].description).toBe('New Description')
    expect(versions[0].fields).toHaveLength(2)
    expect(versions[0].fields[0].name).toBe('B')
    expect(versions[0].fields[1].name).toBe('A')
    expect(versions[0].fields[0].showOnSummaryCard).toBe(true)
    expect(versions[0].fields[1].showOnSummaryCard).toBe(true)
  })
})

describe('Routine Heavy Changes', () => {
  it('creates new version when field added', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [
        { name: 'A', type: 'Text', required: false },
        { name: 'B', type: 'Text', required: false },
      ],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
    expect(versions[1].version).toBe(2)
  })

  it('creates new version when field removed', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [
        { name: 'A', type: 'Text', required: false },
        { name: 'B', type: 'Text', required: false },
      ],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
  })

  it('creates new version when field name changed', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'New Name', type: 'Text', required: false }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
  })

  it('creates new version when field type changed', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'A', type: 'Number', required: false }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
  })

  it('creates new version when field description changed', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false, description: 'Old' }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false, description: 'New' }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
  })

  it('creates new version when required changed', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: false }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'A', type: 'Text', required: true }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
  })

  it('creates new version when ratingMax changed', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Rating', required: true, ratingMax: 5 }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'A', type: 'Rating', required: true, ratingMax: 10 }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
  })

  it('creates new version when options changed', async () => {
    const { addRoutine, updateRoutine, fetchVersions } = useRoutineStore.getState()
    const routineId = await addRoutine({
      title: 'Title',
      fields: [{ name: 'A', type: 'Option', required: false, options: ['1', '2'] }],
    })

    await updateRoutine(routineId, {
      title: 'Title',
      fields: [{ name: 'A', type: 'Option', required: false, options: ['1', '2', '3'] }],
    })

    const versions = await fetchVersions(routineId)
    expect(versions).toHaveLength(2)
  })
})
