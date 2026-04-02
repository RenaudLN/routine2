import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Badge, Button, Group, Loader, Stack, Text, Title, Container, Card, ThemeIcon, Divider } from '@mantine/core'
import { IconArrowLeft, IconTrash, IconSettings, IconListDetails, IconEdit } from '@tabler/icons-react'
import { useRoutineStore } from '../store/routineStore'

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { routines, fetchRoutines, deleteRoutine } = useRoutineStore()

  useEffect(() => {
    if (routines.length === 0) {
      void fetchRoutines()
    }
  }, [routines.length, fetchRoutines])

  const routine = id ? (routines.find((r) => r.routineId === Number(id)) ?? null) : null

  if (!routine) {
    return (
      <Group justify="center" py="xl">
        <Loader variant="dots" />
      </Group>
    )
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${routine.title}"?`)) {
      await deleteRoutine(routine.routineId)
      navigate('/')
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
          <Group justify="space-between" align="flex-start">
             <Stack gap={4}>
                <Title order={2} style={{ fontWeight: 800 }}>{routine.title}</Title>
                <Group gap="xs">
                  <Badge variant="dot" color="indigo">v{routine.version}</Badge>
                  <Text size="sm" c="dimmed">{routine.fields.length} Fields defined</Text>
                </Group>
             </Stack>
             <Group gap="xs">
                <Button 
                  variant="light" 
                  size="sm" 
                  leftSection={<IconEdit size={16} />}
                  onClick={() => navigate(`/routines/${routine.routineId}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  color="red"
                  variant="subtle"
                  size="sm"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
             </Group>
          </Group>
        </Stack>

        {routine.description && (
          <Card radius="lg" padding="lg">
             <Stack gap="xs">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="indigo" size="sm">
                    <IconSettings size={16} />
                  </ThemeIcon>
                  <Text fw={700} size="sm">About this routine</Text>
                </Group>
                <Text size="sm" c="dimmed">{routine.description}</Text>
             </Stack>
          </Card>
        )}

        <Stack gap="md">
          <Group gap="xs">
             <ThemeIcon variant="light" color="indigo" size="sm">
                <IconListDetails size={16} />
             </ThemeIcon>
             <Text fw={700}>Schema definition</Text>
          </Group>
          
          <Stack gap="sm">
            {routine.fields.length === 0 && (
              <Text c="dimmed" size="sm" ta="center" py="xl">No fields defined for this routine.</Text>
            )}
            {routine.fields.map((field) => (
              <Card key={field.name} radius="md" padding="md" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text fw={700} size="sm">{field.name}</Text>
                      <Badge size="xs" variant="outline">{field.type}</Badge>
                      {field.required && <Badge size="xs" color="red" variant="light">required</Badge>}
                    </Group>
                    {field.description && (
                      <Text size="xs" c="dimmed">{field.description}</Text>
                    )}
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        </Stack>

        <Divider />
        
        <Button 
          size="lg" 
          radius="md" 
          onClick={() => navigate(`/routines/${routine.routineId}/record`)}
          variant="gradient"
          gradient={{ from: 'indigo', to: 'cyan' }}
        >
          Record a Session
        </Button>
      </Stack>
    </Container>
  )
}
