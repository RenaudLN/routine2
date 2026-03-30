import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft, IconTrash } from '@tabler/icons-react'
import { useRoutineStore } from '../store/routineStore'
import type { Routine } from '../types'

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { routines, fetchRoutines, deleteRoutine } = useRoutineStore()
  const [routine, setRoutine] = useState<Routine | null>(null)

  useEffect(() => {
    if (routines.length === 0) {
      void fetchRoutines()
    }
  }, [routines.length, fetchRoutines])

  useEffect(() => {
    if (id === 'new') return
    const found = routines.find((r) => r.id === Number(id))
    setRoutine(found ?? null)
  }, [id, routines])

  if (id === 'new') {
    return (
      <Stack>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/routines')} w="fit-content">
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
    if (!routine.id) return
    await deleteRoutine(routine.id)
    navigate('/routines')
  }

  return (
    <Stack>
      <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/routines')} w="fit-content">
        Back
      </Button>

      <Group justify="space-between">
        <Title order={2}>{routine.title}</Title>
        <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={() => void handleDelete()}>
          Delete
        </Button>
      </Group>

      {routine.description && <Text c="dimmed">{routine.description}</Text>}

      <Title order={4} mt="md">Steps</Title>
      {routine.steps.length === 0 && <Text c="dimmed">No steps defined.</Text>}
      {routine.steps
        .sort((a, b) => a.order - b.order)
        .map((step, i) => (
          <Text key={step.id}>
            {i + 1}. {step.title}
          </Text>
        ))}
    </Stack>
  )
}
