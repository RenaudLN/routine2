import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  ColorInput,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
  Container,
  ThemeIcon,
  useMantineTheme,
  Modal,
  Space,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconSettings,
  IconListDetails,
  IconCheck,
  IconBell,
  IconInfoCircle,
  IconEye,
  IconArrowDown,
  IconArrowUp,
} from '@tabler/icons-react'
import { useRoutineStore, getRandomColor } from '../store/routineStore'
import type { FieldType, RoutineField, FrequencyGoal, FrequencyType, Reminder } from '../types'
import { RoutineFormFields } from '../components/RoutineFormFields'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'Text', label: 'Short text' },
  { value: 'LongText', label: 'Long text' },
  { value: 'Date', label: 'Date' },
  { value: 'Number', label: 'Number' },
  { value: 'Rating', label: 'Rating' },
  { value: 'Option', label: 'Select from list' },
]

const FREQUENCY_TYPES: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'specific_days', label: 'Specific days of week' },
]

const DAYS_OF_WEEK = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '0', label: 'Sun' },
]

interface DraftField extends RoutineField {
  /** Temporary client-side key for React list rendering. */
  _key: string
}

function createDraftField(): DraftField {
  return {
    _key: crypto.randomUUID(),
    name: '',
    type: 'Text',
    description: '',
    required: false,
    showOnSummaryCard: false,
  }
}

export default function NewRoutinePage() {
  const theme = useMantineTheme()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { addRoutine, updateRoutine, fetchLatestVersion } = useRoutineStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(getRandomColor())
  const [fields, setFields] = useState<DraftField[]>([createDraftField()])
  const [frequency, setFrequency] = useState<FrequencyGoal>({ type: 'daily', value: 1 })
  const [reminders, setReminders] = useState<Reminder[]>([])
  
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)

  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false)
  const [trackingInfoOpened, { open: openTrackingInfo, close: closeTrackingInfo }] = useDisclosure(false)
  const [summaryInfoOpened, { open: openSummaryInfo, close: closeSummaryInfo }] = useDisclosure(false)

  useEffect(() => {
    if (isEdit && id) {
      void (async () => {
        try {
          const latest = await fetchLatestVersion(Number(id))
          if (latest) {
            setTitle(latest.title)
            setDescription(latest.description ?? '')
            if (latest.color) setColor(latest.color)
            setFields(
              latest.fields.map((f) => ({
                ...f,
                _key: crypto.randomUUID(),
              }))
            )
            if (latest.frequency) {
              setFrequency(latest.frequency)
            }
            if (latest.reminders) {
              setReminders(latest.reminders)
            }
          }
        } catch (err) {
          notifications.show({
            title: 'Error loading routine',
            message: String(err),
            color: 'red',
          })
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [id, isEdit, fetchLatestVersion])

  function updateField(key: string, patch: Partial<DraftField>) {
    setFields((prev) =>
      prev.map((f) => (f._key === key ? { ...f, ...patch } : f)),
    )
  }

  function addField() {
    setFields((prev) => [...prev, createDraftField()])
  }

  function removeField(key: string) {
    setFields((prev) => prev.filter((f) => f._key !== key))
  }

  function moveField(key: string, direction: 'up' | 'down') {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f._key === key)
      if (idx === -1) return prev
      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  function addReminder() {
    setReminders((prev) => [...prev, { id: crypto.randomUUID(), time: '09:00' }])
  }

  function updateReminder(id: string, time: string) {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, time } : r)))
  }

  function removeReminder(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  function validate(): boolean {
    let valid = true

    if (!title.trim()) {
      setTitleError('Routine name is required')
      valid = false
    } else {
      setTitleError(null)
    }

    return valid
  }

  async function handleSave() {
    if (!validate()) return

    const cleanFields: RoutineField[] = fields
      .filter((f) => f.name.trim() !== '')
      .map((f) => {
        const field: RoutineField = {
          name: f.name.trim(),
          type: f.type,
          required: f.required,
          showOnSummaryCard: f.showOnSummaryCard ?? false,
        }
        if (f.description?.trim()) field.description = f.description.trim()
        if (f.type === 'Rating') field.ratingMax = f.ratingMax ?? 5
        if (f.type === 'Option') field.options = f.options ?? []
        return field
      })

    setSaving(true)
    try {
      const routineData = {
        title: title.trim(),
        description: description.trim() || undefined,
        color,
        fields: cleanFields,
        frequency,
        reminders,
      }

      if (isEdit && id) {
        await updateRoutine(Number(id), routineData)
        notifications.show({
          title: 'Routine updated',
          message: `"${title.trim()}" has been updated to a new version.`,
          color: 'green',
        })
        navigate(`/routines/${id}`)
      } else {
        const routineId = await addRoutine(routineData)
        notifications.show({
          title: 'Routine created',
          message: `"${title.trim()}" has been saved.`,
          color: 'green',
        })
        navigate(`/routines/${routineId}`)
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: String(err),
        color: 'red',
      })
      setSaving(false)
    }
  }

  // Get some default swatches from Mantine theme
  const swatches = Object.keys(theme.colors).map(c => theme.colors[c][6])

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader variant="dots" />
      </Group>
    )
  }

  const getFrequencyDescription = () => {
    const val = frequency.value || 1
    switch (frequency.type) {
      case 'daily':
        return `Your goal is to complete this routine ${val} ${val > 1 ? 'times' : 'time'} every day.`
      case 'weekly':
        return `Your goal is to complete this routine ${val} ${val > 1 ? 'times' : 'time'} a week.`
      case 'monthly':
        return `Your goal is to complete this routine ${val} ${val > 1 ? 'times' : 'time'} a month.`
      case 'specific_days':
        return `Your goal is to complete this routine ${val} ${val > 1 ? 'times' : 'time'} on each selected day.`
      default:
        return ''
    }
  }

  return (
    <Container size="sm" p={0}>
      <Stack gap="xl">
        <Stack gap="xs">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/')}
            w="fit-content"
            p={0} h="auto" mb={4}
          >
            Back
          </Button>
          <Title order={2} style={{ fontWeight: 800 }}>
             {isEdit ? 'Configure Routine' : 'New Routine'}
          </Title>
          <Text c="dimmed">
             {isEdit ? 'Changing these settings will create a new version of your routine history.' : 'Design how you want to track your progress.'}
          </Text>
        </Stack>

        {/* Basic Info */}
        <Stack gap="lg">
            <Group gap="xs">
              <ThemeIcon variant="light" color="indigo" radius="md">
                <IconSettings size={18} />
              </ThemeIcon>
              <Text fw={700}>Basic Info</Text>
          </Group>

          <TextInput
            label="Routine Name"
            placeholder="e.g. Daily Meditation, Workout, or Plant Watering"
            required
            radius="md"
            value={title}
            onChange={(e) => {
              setTitle(e.currentTarget.value)
              if (e.currentTarget.value.trim()) setTitleError(null)
            }}
            error={titleError}
          />
          <Textarea
            label="Description"
            placeholder="e.g. A quick check-in to track my mental wellbeing and daily habits."
            autosize
            minRows={2}
            radius="md"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Group align="flex-end" wrap="nowrap" gap="sm">
            <ColorInput 
              label="Routine Color"
              placeholder="Pick color"
              value={color} 
              onChange={setColor} 
              swatches={swatches}
              swatchesPerRow={10}
              style={{ flex: 1 }}
              radius="md"
            />
            <Button variant="light" size="sm" radius="md" onClick={() => setColor(getRandomColor())} h={36}>
              Randomize
            </Button>
          </Group>
        </Stack>

        <Divider />

        {/* Fields Configuration */}
        <Stack gap="md">
           <Group justify="space-between" align="center">
              <Group gap="xs">
                <ThemeIcon variant="light" color="indigo" radius="md">
                    <IconListDetails size={18} />
                </ThemeIcon>
                <Text fw={700}>What would you like to track?</Text>
                <ActionIcon 
                  variant="subtle" 
                  color="gray" 
                  size="sm" 
                  radius="xl"
                  onClick={openTrackingInfo}
                >
                  <IconInfoCircle size={16} />
                </ActionIcon>
              </Group>
              <Button 
                variant="light" 
                size="xs" 
                leftSection={<IconEye size={14} />}
                onClick={openPreview}
                disabled={fields.filter(f => f.name.trim()).length === 0}
              >
                Preview Form
              </Button>
           </Group>

          <Stack gap="sm">
            {fields.map((field, idx) => (
              <Paper key={field._key} withBorder p="md" radius="md" style={{ position: 'relative' }}>
                <Stack gap="sm">
                  <Group align="flex-start" gap="sm" wrap="nowrap">

                    <Stack gap="xs" flex={1}>
                        <TextInput
                          label="Data / Question"
                          placeholder="e.g. Mood, Hours of sleep, or Exercise type"
                          radius="md"
                          value={field.name}
                          onChange={(e) =>
                            updateField(field._key, { name: e.currentTarget.value })
                          }
                        />
                        <Select
                          label="Data type"
                          data={FIELD_TYPES}
                          radius="md"
                          value={field.type}
                          onChange={(val) =>
                            updateField(field._key, { type: (val as FieldType) ?? 'Text' })
                          }
                          allowDeselect={false}
                        />

                        <TextInput
                          label="Hint / Instruction"
                          placeholder="e.g. How are you feeling today? (1-5)"
                          radius="md"
                          value={field.description ?? ''}
                          onChange={(e) =>
                            updateField(field._key, { description: e.currentTarget.value })
                          }
                          style={{ flex: 1 }}
                        />
                        <Group gap="md" mb={10}>
                          <Checkbox
                            label="Required"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(field._key, { required: e.currentTarget.checked })
                            }
                          />
                          <Group gap={4}>
                            <Checkbox
                              label="Show on summary card"
                              checked={field.showOnSummaryCard}
                              onChange={(e) =>
                                updateField(field._key, { showOnSummaryCard: e.currentTarget.checked })
                              }
                            />
                            <ActionIcon 
                              variant="subtle" 
                              color="gray" 
                              size="xs" 
                              radius="xl"
                              onClick={openSummaryInfo}
                            >
                              <IconInfoCircle size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>

                        {field.type === 'Rating' && (
                          <NumberInput
                            label="Maximum Rating"
                            description="The highest value on the scale"
                            min={2}
                            max={100}
                            radius="md"
                            value={field.ratingMax ?? 5}
                            onChange={(val) =>
                              updateField(field._key, {
                                ratingMax: typeof val === 'number' ? val : 5,
                              })
                            }
                            
                          />
                        )}

                        {field.type === 'Option' && (
                          <TagsInput
                            label="Options"
                            description="Type an option and press Enter to add it"
                            placeholder="Add choice…"
                            radius="md"
                            value={field.options ?? []}
                            onChange={(val) => updateField(field._key, { options: val })}
                          />
                        )}
                    </Stack>

                    <Stack gap="xs" align="center">
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="lg"
                        radius="md"
                        mt={24}
                        onClick={() => removeField(field._key)}
                        aria-label="Remove field"
                        disabled={fields.length === 1}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                      <Space h="1.5rem" />
                      <ActionIcon
                        variant="light"
                        size="md"
                        radius="lg"
                        disabled={idx === 0}
                        onClick={() => moveField(field._key, 'up')}
                        aria-label="Move field up"
                      >
                        <IconArrowUp size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        size="md"
                        radius="lg"
                        disabled={idx === fields.length - 1}
                        onClick={() => moveField(field._key, 'down')}
                        aria-label="Move field down"
                      >
                        <IconArrowDown size={16} />
                      </ActionIcon>
                    </Stack>
                  </Group>

                </Stack>
              </Paper>
            ))}
          </Stack>

          <Button
            variant="light"
            leftSection={<IconPlus size={18} />}
            onClick={addField}
            fullWidth
            radius="md"
            size="md"
            mt="xs"
          >
            Add Another Field
          </Button>
        </Stack>

        <Divider />

        {/* Additional Info */}
        <Stack gap="xl">
          <Group gap="xs">
            <ThemeIcon variant="light" color="indigo" radius="md">
              <IconInfoCircle size={18} />
            </ThemeIcon>
            <Text fw={700}>Frequency & Reminders</Text>
          </Group>

          <Stack gap="sm">
            <Select
              label="Frequency"
              data={FREQUENCY_TYPES}
              value={frequency.type}
              onChange={(val) => setFrequency({ ...frequency, type: (val as FrequencyType) || 'daily' })}
              radius="md"
            />
            
            <NumberInput
              label={
                frequency.type === 'daily' ? 'Times per day' :
                frequency.type === 'weekly' ? 'Times per week' :
                frequency.type === 'monthly' ? 'Times per month' :
                'Times per day'
              }
              description={getFrequencyDescription()}
              min={1}
              max={frequency.type === 'weekly' ? 7 : 31}
              value={frequency.value ?? 1}
              onChange={(val) => setFrequency({ ...frequency, value: typeof val === 'number' ? val : 1 })}
              radius="md"
            />

            {frequency.type === 'specific_days' && (
              <Checkbox.Group
                label="On which days?"
                value={(frequency.days || []).map(String)}
                onChange={(val) => setFrequency({ ...frequency, days: val.map(Number) })}
              >
                <Group mt="xs" gap="sm">
                  {DAYS_OF_WEEK.map((day) => (
                    <Checkbox key={day.value} value={day.value} label={day.label} />
                  ))}
                </Group>
              </Checkbox.Group>
            )}
          </Stack>

          <Divider variant="dashed" />

          {/* Reminders */}
          <Stack gap="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon variant="light" color="orange" radius="md">
                <IconBell size={18} />
              </ThemeIcon>
              <Text fw={700}>Reminders</Text>
            </Group>

            {reminders.map((reminder) => (
              <Group key={reminder.id} align="flex-end">
                <TextInput
                  label="Reminder time"
                  type="time"
                  value={reminder.time}
                  onChange={(e) => updateReminder(reminder.id, e.currentTarget.value)}
                  radius="md"
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  color="red"
                  variant="light"
                  size="lg"
                  radius="md"
                  onClick={() => removeReminder(reminder.id)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            ))}

            <Button
              variant="light"
              color="orange"
              leftSection={<IconPlus size={18} />}
              onClick={addReminder}
              fullWidth
              radius="md"
            >
              Add Reminder
            </Button>
          </Stack>
        </Stack>

        <Divider />

        <Group justify="flex-end" pb="xl">
          <Button variant="subtle" onClick={() => navigate('/')} radius="md">
            Cancel
          </Button>
          <Button 
            loading={saving} 
            onClick={() => void handleSave()} 
            radius="md" 
            size="md"
            variant="gradient"
            gradient={{ from: 'indigo', to: 'cyan' }}
            leftSection={<IconCheck size={18} />}
          >
            {isEdit ? 'Save Changes' : 'Create Routine'}
          </Button>
        </Group>
      </Stack>

      {/* Preview Modal */}
      <Modal
        opened={previewOpened}
        onClose={closePreview}
        title={
          <Group gap="sm">
            <ThemeIcon variant="light" color="indigo" radius="md">
              <IconEye size={18} />
            </ThemeIcon>
            <Text fw={700}>Preview: {title || 'Untitled Routine'}</Text>
          </Group>
        }
        size="md"
        radius="lg"
        centered
      >
        <Stack gap="lg" py="md">
          <Text size="sm" c="dimmed">This is how your routine form will look when you record a session.</Text>
          <Divider />
          <RoutineFormFields
            fields={fields
              .filter(f => f.name.trim() !== '')
              .map(f => ({
                name: f.name,
                type: f.type,
                description: f.description,
                required: f.required,
                ratingMax: f.ratingMax,
                options: f.options,
                showOnSummaryCard: f.showOnSummaryCard
              }))
            }
            fieldValues={{}}
            setField={() => {}}
            readOnly
          />
        </Stack>
      </Modal>

      {/* Info Modals */}
      <Modal
        opened={trackingInfoOpened}
        onClose={closeTrackingInfo}
        title="Tracking Information"
        radius="lg"
        centered
      >
        <Text size="sm">
          Define the questions you want to answer each time you record this routine. 
          For example, if you're tracking "Reading", you might want to track "Book title" (text) and "Pages read" (number).
        </Text>
        <Button onClick={closeTrackingInfo} fullWidth mt="lg" radius="md">Got it</Button>
      </Modal>

      <Modal
        opened={summaryInfoOpened}
        onClose={closeSummaryInfo}
        title="Summary Card"
        radius="lg"
        centered
      >
        <Text size="sm">
          If checked, this information will be visible directly on your history list. 
          This is useful for seeing key data points (like your mood or a short note) without having to open every session detail.
        </Text>
        <Button onClick={closeSummaryInfo} fullWidth mt="lg" radius="md">Got it</Button>
      </Modal>
    </Container>
  )
}
