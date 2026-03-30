import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Group, Loader, NumberInput, Rating, Select,
  Stack, Text, Textarea, TextInput, Title, Alert,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react'
import { useRoutineStore } from '../store/routineStore'
import { useActivityStore, todayISO } from '../store/activityStore'
import type { RoutineVersion, FieldValue } from '../types'

export default function RecordActivityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchLatestVersion } = useRoutineStore()
  const { addActivity } = useActivityStore()

  const [routine, setRoutine] = useState<RoutineVersion | null>(null)
  const [loadingRoutine, setLoadingRoutine] = useState(true)
  const [date, setDate] = useState<string>(todayISO())
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | null>>({})
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    setLoadingRoutine(true)
    fetchLatestVersion(Number(id))
      .then((version) => {
        setRoutine(version)
        if (version) {
          const initial: Record<string, string | number | null> = {}
          for (const field of version.fields) initial[field.name] = null
          setFieldValues(initial)
        }
      })
      .finally(() => setLoadingRoutine(false))
  }, [id, fetchLatestVersion])

  const setField = (name: string, value: string | number | null) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }))
    if (validationErrors[name]) {
      setValidationErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const validate = (): boolean => {
    if (!routine) return false
    const errors: Record<string, string> = {}
    for (const field of routine.fields) {
      if (field.required) {
        const val = fieldValues[field.name]
        if (val === null || val === undefined || val === '')
          errors[field.name] = `${field.name} is required`
      }
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const buildFieldValues = (): FieldValue[] =>
    Object.entries(fieldValues).map(([fieldName, value]) => ({ fieldName, value }))

  const handleSave = async (status: 'complete' | 'draft') => {
    if (status === 'complete' && !validate()) return
    if (!routine) return
    setSaving(true)
    try {
      await addActivity({
        routineId: routine.routineId,
        routineVersion: routine.version,
        date,
        status,
        fieldValues: buildFieldValues(),
      })
      notifications.show({
        title: status === 'complete' ? 'Activity saved!' : 'Draft saved',
        message: status === 'complete'
          ? `${routine.title} recorded for ${date}.`
          : `Draft saved for ${routine.title}.`,
        color: status === 'complete' ? 'green' : 'blue',
      })
      navigate(`/routines/${routine.routineId}`)
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  if (loadingRoutine) return <Loader />

  if (!routine) {
    return (
      <Stack>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/')} w="fit-content">Back</Button>
        <Alert icon={<IconAlertCircle size={16} />} color="red">Routine not found.</Alert>
      </Stack>
    )
  }

  return (
    <Stack>
      <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate(`/routines/${routine.routineId}`)} w="fit-content">
        Back
      </Button>

      <Title order={2}>Record: {routine.title}</Title>
      {routine.description && <Text c="dimmed">{routine.description}</Text>}

      {/* Activity date */}
      <TextInput
        label="Date"
        description="Date of this activity"
        type="date"
        value={date}
        onChange={(e) => setDate(e.currentTarget.value)}
        required
        maw={220}
      />

      {routine.fields.length === 0 && (
        <Text c="dimmed">This routine has no fields defined.</Text>
      )}

      {routine.fields.map((field) => {
        const error = validationErrors[field.name]
        const value = fieldValues[field.name]

        if (field.type === 'Text') {
          return (
            <Textarea key={field.name} label={field.name} description={field.description}
              required={field.required} error={error}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => setField(field.name, e.currentTarget.value || null)}
              autosize minRows={2} />
          )
        }

        if (field.type === 'Number') {
          return (
            <NumberInput key={field.name} label={field.name} description={field.description}
              required={field.required} error={error}
              value={typeof value === 'number' ? value : ''}
              onChange={(val) => setField(field.name, val === '' ? null : Number(val))}
              maw={220} />
          )
        }

        if (field.type === 'Rating') {
          const max = field.ratingMax ?? 5
          return (
            <Stack key={field.name} gap={4}>
              <Text size="sm" fw={500}>
                {field.name}
                {field.required && <Text component="span" c="red" ml={4}>*</Text>}
              </Text>
              {field.description && <Text size="xs" c="dimmed">{field.description}</Text>}
              <Rating count={max} value={typeof value === 'number' ? value : 0}
                onChange={(val) => setField(field.name, val === 0 ? null : val)} />
              {error && <Text size="xs" c="red">{error}</Text>}
            </Stack>
          )
        }

        if (field.type === 'Date') {
          return (
            <TextInput key={field.name} label={field.name} description={field.description}
              required={field.required} error={error} type="date"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => setField(field.name, e.currentTarget.value || null)}
              maw={220} />
          )
        }

        if (field.type === 'Option') {
          return (
            <Select key={field.name} label={field.name} description={field.description}
              required={field.required} error={error}
              data={field.options ?? []}
              value={typeof value === 'string' ? value : null}
              onChange={(val) => setField(field.name, val)}
              clearable maw={320} />
          )
        }

        return null
      })}

      <Group mt="md">
        <Button onClick={() => void handleSave('complete')} loading={saving}>
          Save
        </Button>
        <Button variant="light" onClick={() => void handleSave('draft')} loading={saving}>
          Save as Draft
        </Button>
      </Group>
    </Stack>
  )
}
