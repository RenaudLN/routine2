// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

export type FieldType = 'Text' | 'Date' | 'Number' | 'Rating' | 'Option'

/**
 * Definition of a single field within a Routine version.
 * name is unique within a version and acts as the field identifier.
 * Field order is determined by array position in RoutineVersion.fields.
 */
export interface RoutineField {
  name: string
  type: FieldType
  description?: string
  required: boolean
  /** Rating only - maximum value on the scale. Defaults to 5. */
  ratingMax?: number
  /** Option only - exhaustive list of selectable values. */
  options?: string[]
}

// ---------------------------------------------------------------------------
// Routine family (stable identity across versions)
// ---------------------------------------------------------------------------

/**
 * Thin record that owns the stable routineId.
 * All display data lives in RoutineVersion.
 */
export interface Routine {
  /** Auto-incremented by Dexie; undefined before first save. */
  id?: number
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Routine version
// ---------------------------------------------------------------------------

/**
 * One immutable snapshot of a Routine definition.
 * A new row is created every time the user edits a Routine.
 */
export interface RoutineVersion {
  /** Auto-incremented by Dexie; undefined before first save. */
  id?: number
  /** FK to Routine.id - stable across all versions. */
  routineId: number
  /** 1-based counter, auto-incremented per routineId. */
  version: number
  title: string
  description?: string
  /** Ordered array of field definitions; position = array index. */
  fields: RoutineField[]
  createdAt: Date
  /** True only for the most recent version of this routineId. */
  isLatest: boolean
  /** Set when the user soft-deletes the Routine. */
  deletedAt?: Date
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

/**
 * A single logged instance of a Routine on a given date.
 */
export interface Activity {
  /** Auto-incremented by Dexie; undefined before first save. */
  id?: number
  /** FK to Routine.id */
  routineId: number
  /** The version of the Routine that was active when this Activity was created. */
  routineVersion: number
  /** ISO date string YYYY-MM-DD - user-chosen, defaults to today. */
  date: string
  status: 'complete'
  /** One entry per field; all required fields are populated for completion. */
  fieldValues: FieldValue[]
  createdAt: Date
  updatedAt: Date
}

/**
 * The recorded value for a single field within an Activity.
 * fieldName matches RoutineField.name from the corresponding RoutineVersion.
 */
export interface FieldValue {
  fieldName: string
  /** string for Text/Date/Option, number for Number/Rating, null if not filled in. */
  value: string | number | null
}
