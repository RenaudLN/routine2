import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Group, Loader, NumberInput, Rating, Select,
  Stack, Text, Textarea, TextInput, Title, Alert,
  Container, Card, ThemeIcon, Box, Divider,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconAlertCircle, IconCheck, IconCalendar } from '@tabler/icons-react'
import { useRoutineStore } from '../store/routineStore'
import { useActivityStore, todayISO } from '../store/activityStore'
import type { RoutineVersion, FieldValue } from '../types'

export default function RecordActivityPage() {
  const { id, activityId } = useParams<{ id?: string, activityId?: string }>()
  const navigate = useNavigate()
  const { fetchLatestVersion, fetchSpecificVersion } = useRoutineStore()
  const { addActivity, updateActivity, fetchActivityById } = useActivityStore()

  const [routine, setRoutine] = useState<RoutineVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>(todayISO())
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | null>>({})
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (activityId) {
          const activity = await fetchActivityById(Number(activityId))
          if (activity) {
            setDate(activity.date)
            const version = await fetchSpecificVersion(activity.routineId, activity.routineVersion)
            setRoutine(version ?? null)
            if (version) {
              const initial: Record<string, string | number | null> = {}
              for (const field of version.fields) {
                const found = activity.fieldValues.find((fv) => fv.fieldName === field.name)
                initial[field.name] = found ? found.value : null
              }
              setFieldValues(initial)
            }
          }
        } else if (id) {
          const version = await fetchLatestVersion(Number(id))
          setRoutine(version)
          if (version) {
            const initial: Record<string, string | number | null> = {}
            for (const field of version.fields) initial[field.name] = null
            setFieldValues(initial)
          }
        }
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [id, activityId, fetchLatestVersion, fetchSpecificVersion, fetchActivityById])

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

  const handleSave = async () => {
    if (!validate()) return
    if (!routine) return
    setSaving(true)
    try {
      if (activityId) {
        await updateActivity(Number(activityId), {
          date,
          fieldValues: buildFieldValues(),
        })
        notifications.show({
          title: 'Activity updated!',
          message: `${routine.title} for ${date} has been updated.`,
          color: 'green',
        })
        navigate('/history')
      } else {
        await addActivity({
          routineId: routine.routineId,
          routineVersion: routine.version,
          date,
          status: 'complete',
          fieldValues: buildFieldValues(),
        })
        notifications.show({
          title: 'Activity saved!',
          message: `${routine.title} recorded for ${date}.`,
          color: 'green',
        })
        navigate('/')
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Group justify="center" py="xl"><Loader variant="dots" /></Group>

  if (!routine) {
    return (
      <Container size="sm" p={0}>
        <Stack>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(-1)} w="fit-content">Back</Button>
          <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">Routine or Activity not found.</Alert>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="sm" p={0}>
      <Stack gap="xl">
        <Stack gap="xs">
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(-1)} w="fit-content" p={0} h="auto" mb={4}>
            Back
          </Button>
          <Title order={2} style={{ fontWeight: 800 }}>{activityId ? 'Edit Session' : 'Record Session'}</Title>
          <Text c="dimmed">{routine.title}</Text>
        </Stack>

        <Card radius="lg" padding="lg">
          <Stack gap="lg">
            <Group gap="xs" mb="xs">
               <ThemeIcon variant="light" color="indigo" radius="md">
                  <IconCalendar size={18} />
               </ThemeIcon>
               <Text fw={700}>Session Details</Text>
            </Group>

            <TextInput
              label="Activity Date"
              description="When did you do this?"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
              required
              radius="md"
              maw={300}
            />

            <Divider />

            {routine.fields.length === 0 && (
              <Box py="md">
                <Text c="dimmed" ta="center">This routine has no fields defined.</Text>
              </Box>
            )}

            {routine.fields.map((field) => {
              const error = validationErrors[field.name]
              const value = fieldValues[field.name]

              return (
                <Box key={field.name}>
                  {field.type === 'Text' && (
                    <TextInput label={field.name} description={field.description}
                      required={field.required} error={error}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => setField(field.name, e.currentTarget.value || null)}
                      radius="md" />
                  )}

                  {field.type === 'LongText' && (
                    <Textarea label={field.name} description={field.description}
                      required={field.required} error={error}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => setField(field.name, e.currentTarget.value || null)}
                      autosize minRows={2} radius="md" />
                  )}

                  {field.type === 'Number' && (
                    <NumberInput label={field.name} description={field.description}
                      required={field.required} error={error}
                      value={typeof value === 'number' ? value : ''}
                      onChange={(val) => setField(field.name, val === '' ? null : Number(val))}
                      radius="md" maw={300} />
                  )}

                  {field.type === 'Rating' && (
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>
                        {field.name}
                        {field.required && <Text component="span" c="red" ml={4}>*</Text>}
                      </Text>
                      {field.description && <Text size="xs" c="dimmed">{field.description}</Text>}
                      <Rating count={field.ratingMax ?? 5} value={typeof value === 'number' ? value : 0}
                        onChange={(val) => setField(field.name, val === 0 ? null : val)} size="lg" />
                      {error && <Text size="xs" c="red">{error}</Text>}
                    </Stack>
                  )}

                  {field.type === 'Date' && (
                    <TextInput label={field.name} description={field.description}
                      required={field.required} error={error} type="date"
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => setField(field.name, e.currentTarget.value || null)}
                      radius="md" maw={300} />
                  )}

                  {field.type === 'Option' && (
                    <Select label={field.name} description={field.description}
                      required={field.required} error={error}
                      data={field.options ?? []}
                      value={typeof value === 'string' ? value : null}
                      onChange={(val) => setField(field.name, val)}
                      clearable radius="md" maw={400} />
                  )}
                </Box>
              )
            })}

            <Stack gap="sm" mt="md">
              <Button 
                size="md" 
                radius="md" 
                onClick={() => void handleSave()} 
                loading={saving}
                leftSection={<IconCheck size={18} />}
                variant="gradient"
                gradient={{ from: 'indigo', to: 'cyan' }}
              >
                {activityId ? 'Update Activity' : 'Save Activity'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
