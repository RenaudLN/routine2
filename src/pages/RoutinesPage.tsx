import { useEffect } from 'react'
import { Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useRoutineStore } from '../store/routineStore'

export default function RoutinesPage() {
  const { routines, loading, fetchRoutines } = useRoutineStore()
  const navigate = useNavigate()

  useEffect(() => {
    void fetchRoutines()
  }, [fetchRoutines])

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>My Routines</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/routines/new')}>
          New Routine
        </Button>
      </Group>

      {loading && <Loader />}

      {!loading && routines.length === 0 && (
        <Text c="dimmed">No routines yet. Create your first one!</Text>
      )}

      {routines.map((routine) => (
        <Card
          key={routine.id}
          shadow="sm"
          padding="md"
          radius="md"
          withBorder
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/routines/${routine.id}`)}
        >
          <Text fw={600}>{routine.title}</Text>
          {routine.description && (
            <Text size="sm" c="dimmed" mt={4}>
              {routine.description}
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={8}>
            {routine.steps.length} step{routine.steps.length !== 1 ? 's' : ''}
          </Text>
        </Card>
      ))}
    </Stack>
  )
}
