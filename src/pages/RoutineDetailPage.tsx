import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Badge, Button, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft, IconTrash } from '@tabler/icons-react'
import { useRoutineStore } from '../store/routineStore'
import type { RoutineVersion } from '../types'

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { routines, fetchRoutines, deleteRoutine } = useRoutineStore()
  const [routine, setRoutine] = useState<RoutineVersion | null>(null)

  useEffect(() => {
    if (routines.length === 0) {
      void fetchRoutines()
    }
  }, [routines.length, fetchRoutines])

  useEffect(() => {
    if (id === 'new') return
    const found = routines.find((r) => r.routineId === Number(id))
    setRoutine(found ?? null)
  }, [id, routines])

  if (id === 'new') {
    return (
      <Stack>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/routines')}
          w="fit-content"
        >
          Back
        </Button>
        <Title order={2}>New Routine</Title>
        <Text c="dimmed">Routine creation form coming soon.</Text>
      </Stack>
    )
  }

  if (!routine) {
    return <Loader />
  }

  const handleDelete = async () => {
    await deleteRoutine(routine.routineId)
    navigate('/routines')
  }

  return (
    <Stack>
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/routines')}
        w="fit-content"
      >
        Back
      </Button>

      <Group justify="space-between">
        <Group gap="xs">
          <Title order={2}>{routine.title}</Title>
          <Badge variant="light" color="gray">v{routine.version}</Badge>
        </Group>
        <Button
          color="red"
          variant="light"
          leftSection={<IconTrash size={16} />}
          onClick={() => void handleDelete()}
        >
          Delete
        </Button>
      </Group>

      {routine.description && <Text c="dimmed">{routine.description}</Text>}

      <Title order={4} mt="md">Fields</Title>
      {routine.fields.length === 0 && <Text c="dimmed">No fields defined.</Text>}
      {routine.fields.map((field) => (
        <Group key={field.name} gap="xs">
          <Text fw={500}>{field.name}</Text>
          <Badge size="sm" variant="outline">{field.type}</Badge>
          {field.required && <Badge size="sm" color="red" variant="light">required</Badge>}
          {field.description && (
            <Text size="sm" c="dimmed">{field.description}</Text>
          )}
        </Group>
      ))}
    </Stack>
  )
}
