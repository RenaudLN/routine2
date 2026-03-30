import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconArrowLeft,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useRoutineStore } from '../store/routineStore'
import type { FieldType, RoutineField } from '../types'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'Text', label: 'Text' },
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
  const { addRoutine } = useRoutineStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<DraftField[]>([createDraftField()])
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Field helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!validate()) return

    // Strip empty-name fields and clean up type-specific extras
    const cleanFields: RoutineField[] = fields
      .filter((f) => f.name.trim() !== '')
      .map(({ _key, ...rest }) => {
        const field: RoutineField = {
          name: rest.name.trim(),
          type: rest.type,
          required: rest.required,
        }
        if (rest.description?.trim()) field.description = rest.description.trim()
        if (rest.type === 'Rating') field.ratingMax = rest.ratingMax ?? 5
        if (rest.type === 'Option') field.options = rest.options ?? []
        return field
      })

    setSaving(true)
    try {
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
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: String(err),
        color: 'red',
      })
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Stack maw={680} mx="auto">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/')}
          w="fit-content"
        >
          Back
        </Button>
      </Group>

      <Title order={2}>New Routine</Title>

      {/* Routine metadata */}
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <TextInput
            label="Routine name"
            placeholder="e.g. Morning check-in"
            required
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
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
        </Stack>
      </Paper>

      {/* Fields */}
      <Title order={4} mt="xs">
        Fields
      </Title>
      <Text size="sm" c="dimmed" mt={-8}>
        Define the data you want to capture each time you run this routine.
      </Text>

      <Stack gap="sm">
        {fields.map((field, idx) => (
          <Paper key={field._key} withBorder p="md" radius="md">
            <Stack gap="sm">
              {/* Row 1: drag handle + name + type + remove */}
              <Group align="flex-end" gap="sm" wrap="nowrap">
                {/* Reorder buttons */}
                <Stack gap={2} style={{ flexShrink: 0 }}>
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    disabled={idx === 0}
                    onClick={() => moveField(field._key, 'up')}
                    aria-label="Move field up"
                  >
                    <IconGripVertical size={12} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    disabled={idx === fields.length - 1}
                    onClick={() => moveField(field._key, 'down')}
                    aria-label="Move field down"
                  >
                    <IconGripVertical size={12} />
                  </ActionIcon>
                </Stack>

                <TextInput
                  label="Field name"
                  placeholder="e.g. Mood"
                  value={field.name}
                  onChange={(e) =>
                    updateField(field._key, { name: e.currentTarget.value })
                  }
                  style={{ flex: 1 }}
                />

                <Select
                  label="Type"
                  data={FIELD_TYPES}
                  value={field.type}
                  onChange={(val) =>
                    updateField(field._key, { type: (val as FieldType) ?? 'Text' })
                  }
                  w={130}
                  allowDeselect={false}
                />

                <ActionIcon
                  color="red"
                  variant="light"
                  size="lg"
                  mt={24}
                  onClick={() => removeField(field._key)}
                  aria-label="Remove field"
                  disabled={fields.length === 1}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>

              {/* Row 2: description + required */}
              <Group align="flex-end" gap="sm">
                <TextInput
                  label="Description"
                  placeholder="Optional hint for this field"
                  value={field.description ?? ''}
                  onChange={(e) =>
                    updateField(field._key, { description: e.currentTarget.value })
                  }
                  style={{ flex: 1 }}
                />
                <Checkbox
                  label="Required"
                  checked={field.required}
                  onChange={(e) =>
                    updateField(field._key, { required: e.currentTarget.checked })
                  }
                  mb={6}
                />
              </Group>

              {/* Row 3: type-specific options */}
              {field.type === 'Rating' && (
                <NumberInput
                  label="Max rating"
                  description="The highest value on the scale"
                  min={2}
                  max={100}
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
        leftSection={<IconPlus size={16} />}
        onClick={addField}
        w="fit-content"
      >
        Add field
      </Button>

      <Divider mt="sm" />

      {/* Actions */}
      <Group justify="flex-end" pb="xl">
        <Button variant="default" onClick={() => navigate('/')}>
          Cancel
        </Button>
        <Button loading={saving} onClick={() => void handleSave()}>
          Save routine
        </Button>
      </Group>
    </Stack>
  )
}
