import { useEffect } from 'react'
import { Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useRoutineStore } from '../store/routineStore'

export default function HomePage() {
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
        <Stack align="center" mt="xl" gap="md">
          <Title order={3}>Welcome to Routine Tracker</Title>
          <Text c="dimmed" ta="center" maw={480}>
            Build and track your personal routines — all stored locally on your device.
          </Text>
          <Button size="md" onClick={() => navigate('/routines/new')}>
            Create Your First Routine
          </Button>
        </Stack>
      )}

      {routines.map((routine) => (
        <Card
          key={routine.routineId}
          shadow="sm"
          padding="md"
          radius="md"
          withBorder
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/routines/${routine.routineId}/record`)}
        >
          <Text fw={600}>{routine.title}</Text>
          {routine.description && (
            <Text size="sm" c="dimmed" mt={4}>
              {routine.description}
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={8}>
            v{routine.version} &middot; {routine.fields.length} field
            {routine.fields.length !== 1 ? 's' : ''}
          </Text>
        </Card>
      ))}
    </Stack>
  )
}
