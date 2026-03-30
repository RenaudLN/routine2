import { useEffect } from 'react'
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import {
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useRoutineStore } from '../store/routineStore'

export default function HomePage() {
  const { routines, loading, fetchRoutines, deleteRoutine } = useRoutineStore()
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
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={0} style={{ flex: 1 }}>
              <Text fw={600}>{routine.title}</Text>
              {routine.description && (
                <Text size="sm" c="dimmed" mt={4}>
                  {routine.description}
                </Text>
              )}
            </Stack>

            <Menu position="bottom-end" shadow="md" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={() => navigate(`/routines/${routine.routineId}/edit`)}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete "${routine.title}"?`
                      )
                    ) {
                      void deleteRoutine(routine.routineId)
                    }
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Text size="xs" c="dimmed" mt={8}>
            v{routine.version} &middot; {routine.fields.length} field
            {routine.fields.length !== 1 ? 's' : ''}
          </Text>
        </Card>
      ))}
    </Stack>
  )
}
