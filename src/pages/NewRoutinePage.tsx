import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
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
  Card,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconArrowLeft,
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconSettings,
  IconListDetails,
  IconCheck,
} from '@tabler/icons-react'
import { useRoutineStore } from '../store/routineStore'
import type { FieldType, RoutineField } from '../types'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'Text', label: 'Text' },
  { value: 'LongText', label: 'Long text' },
  { value: 'Date', label: 'Date' },
  { value: 'Number', label: 'Number' },
  { value: 'Rating', label: 'Rating' },
  { value: 'Option', label: 'Option' },
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
  }
}

export default function NewRoutinePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { addRoutine, updateRoutine, fetchLatestVersion } = useRoutineStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<DraftField[]>([createDraftField()])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit && id) {
      void (async () => {
        try {
          const latest = await fetchLatestVersion(Number(id))
          if (latest) {
            setTitle(latest.title)
            setDescription(latest.description ?? '')
            setFields(
              latest.fields.map((f) => ({
                ...f,
                _key: crypto.randomUUID(),
              }))
            )
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
        }
        if (f.description?.trim()) field.description = f.description.trim()
        if (f.type === 'Rating') field.ratingMax = f.ratingMax ?? 5
        if (f.type === 'Option') field.options = f.options ?? []
        return field
      })

    setSaving(true)
    try {
      if (isEdit && id) {
        await updateRoutine(Number(id), {
          title: title.trim(),
          description: description.trim() || undefined,
          fields: cleanFields,
        })
        notifications.show({
          title: 'Routine updated',
          message: `"${title.trim()}" has been updated to a new version.`,
          color: 'green',
        })
        navigate(`/routines/${id}`)
      } else {
        const routineId = await addRoutine({
          title: title.trim(),
          description: description.trim() || undefined,
          fields: cleanFields,
        })
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

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader variant="dots" />
      </Group>
    )
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
             {isEdit ? 'Updates will create a new version of this routine.' : 'Define your routine structure.'}
          </Text>
        </Stack>

        <Card radius="lg" padding="lg">
          <Stack gap="lg">
             <Group gap="xs" mb="xs">
               <ThemeIcon variant="light" color="indigo" radius="md">
                  <IconSettings size={18} />
               </ThemeIcon>
               <Text fw={700}>Basic Info</Text>
            </Group>

            <TextInput
              label="Routine Name"
              placeholder="e.g. Morning check-in"
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
              placeholder="Optional — describe what this routine is for"
              autosize
              minRows={2}
              radius="md"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </Stack>
        </Card>

        <Stack gap="md">
           <Group justify="space-between" align="center">
              <Group gap="xs">
                <ThemeIcon variant="light" color="indigo" radius="md">
                    <IconListDetails size={18} />
                </ThemeIcon>
                <Text fw={700}>Fields Configuration</Text>
              </Group>
           </Group>

          <Stack gap="sm">
            {fields.map((field, idx) => (
              <Paper key={field._key} withBorder p="md" radius="md" style={{ position: 'relative' }}>
                <Stack gap="sm">
                  <Group align="flex-start" gap="sm" wrap="nowrap">
                    <Stack gap={2} style={{ flexShrink: 0 }} mt={24}>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => moveField(field._key, 'up')}
                        aria-label="Move field up"
                      >
                        <IconGripVertical size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        disabled={idx === fields.length - 1}
                        onClick={() => moveField(field._key, 'down')}
                        aria-label="Move field down"
                      >
                        <IconGripVertical size={14} />
                      </ActionIcon>
                    </Stack>

                    <Stack gap="xs" style={{ flex: 1 }}>
                        <TextInput
                          label="Field name"
                          placeholder="e.g. Mood"
                          radius="md"
                          value={field.name}
                          onChange={(e) =>
                            updateField(field._key, { name: e.currentTarget.value })
                          }
                        />
                        <Select
                          label="Type"
                          data={FIELD_TYPES}
                          radius="md"
                          value={field.type}
                          onChange={(val) =>
                            updateField(field._key, { type: (val as FieldType) ?? 'Text' })
                          }
                          allowDeselect={false}
                        />
                    </Stack>

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
                  </Group>

                  <Divider variant="dashed" />

                  <Group align="flex-end" gap="sm">
                    <TextInput
                      label="Description"
                      placeholder="Optional hint for this field"
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
                      <Checkbox
                        label="Summary Card"
                        checked={field.showOnSummaryCard}
                        onChange={(e) =>
                          updateField(field._key, { showOnSummaryCard: e.currentTarget.checked })
                        }
                      />
                    </Group>
                  </Group>

                  {field.type === 'Rating' && (
                    <NumberInput
                      label="Max rating"
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
                      w={160}
                    />
                  )}

                  {field.type === 'Option' && (
                    <TagsInput
                      label="Options"
                      description="Type an option and press Enter to add it"
                      placeholder="Add option…"
                      radius="md"
                      value={field.options ?? []}
                      onChange={(val) => updateField(field._key, { options: val })}
                    />
                  )}
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
            {isEdit ? 'Save New Version' : 'Create Routine'}
          </Button>
        </Group>
      </Stack>
    </Container>
  )
}
