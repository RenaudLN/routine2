import { useEffect, useState } from 'react'
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  ThemeIcon,
  Container,
  Alert,
  Badge,
} from '@mantine/core'
import {
  IconSettings,
  IconPlus,
  IconActivity,
  IconBell,
  IconCheck,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useRoutineStore } from '../store/routineStore'
import { useActivityStore } from '../store/activityStore'
import { getRoutineProgress } from '../utils/objectives'
import { checkNotificationPermission, requestNotificationPermission, registerPeriodicSync } from '../utils/notifications'
import { useNotificationScheduler } from '../hooks/useNotificationScheduler'

export default function HomePage() {
  const { routines, loading, fetchRoutines } = useRoutineStore()
  const { activities, fetchRecentActivities } = useActivityStore()
  const navigate = useNavigate()
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Initialize foreground notification scheduler
  useNotificationScheduler()

  useEffect(() => {
    void fetchRoutines()
    void fetchRecentActivities(31) // Fetch last 31 days to cover monthly goals
    void checkNotificationPermission().then((perm) => {
      setNotificationPermission(perm)
      if (perm === 'granted') {
        void registerPeriodicSync()
      }
    })
  }, [fetchRoutines, fetchRecentActivities])

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      setNotificationPermission('granted')
      // Register for periodic background sync
      await registerPeriodicSync()
    } else {
      setNotificationPermission('denied')
    }
  }

  return (
    <Container size="sm" p={0}>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <Stack gap={0}>
            <Title order={2} style={{ fontWeight: 800 }}>My Routines</Title>
            <Text c="dimmed" size="sm">Manage and track your daily habits</Text>
          </Stack>
          <Button 
            variant="light" 
            size="sm" 
            radius="md" 
            onClick={() => navigate('/routines/new')}
            leftSection={<IconPlus size={16} />}
          >
            New Routine
          </Button>
        </Group>

        {notificationPermission === 'default' && (
          <Alert
            icon={<IconBell size={16} />}
            title="Enable Notifications"
            color="indigo"
            radius="md"
            withCloseButton={false}
            variant="light"
          >
            <Text size="sm" mb="xs">
              Get reminders for your routines. Stay consistent with your goals.
            </Text>
            <Button size="xs" variant="filled" color="indigo" onClick={handleEnableNotifications}>
              Enable
            </Button>
          </Alert>
        )}

        {loading && (
          <Group justify="center" py="xl">
            <Loader variant="dots" />
          </Group>
        )}

        {!loading && routines.length === 0 && (
          <Card padding="xl" radius="lg" withBorder style={{ textAlign: 'center', borderStyle: 'dashed' }}>
            <Stack align="center" gap="md">
              <ThemeIcon size={64} radius="xl" variant="light" color="indigo">
                <IconActivity size={32} />
              </ThemeIcon>
              <Title order={3}>No routines yet</Title>
              <Text c="dimmed" ta="center" maw={400} mx="auto">
                Build and track your personal routines — all stored locally on your device for privacy.
              </Text>
              <Button 
                size="md" 
                variant="gradient" 
                gradient={{ from: 'indigo', to: 'cyan' }}
                onClick={() => navigate('/routines/new')}
                leftSection={<IconPlus size={18} />}
                mt="md"
              >
                Create Your First Routine
              </Button>
            </Stack>
          </Card>
        )}

        <Stack gap="md">
          {routines.map((routine) => {
            const progress = getRoutineProgress(routine, activities)
            return (
              <Card
                key={routine.routineId}
                padding="lg"
                radius="lg"
                onClick={() => navigate(`/routines/${routine.routineId}/record`)}
                style={{ cursor: 'pointer' }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" align="center" wrap="nowrap" style={{ flex: 1 }}>
                    <ThemeIcon 
                      size={40} 
                      radius="md" 
                      variant="light" 
                      color={routine.color || 'indigo'}
                    >
                      <IconActivity size={22} />
                    </ThemeIcon>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Group gap="xs" align="center">
                        <Text fw={700} size="lg">{routine.title}</Text>
                        {progress.isMet && (
                          <Badge color="green" variant="light" leftSection={<IconCheck size={10} />}>
                            Goal Met
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        {routine.description && (
                          <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                            {routine.description}
                          </Text>
                        )}
                        {progress.target > 0 && (
                          <Text size="xs" c="dimmed" fw={500}>
                            {progress.current}/{progress.target} {progress.periodLabel}
                          </Text>
                        )}
                      </Group>
                    </Stack>
                  </Group>

                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/routines/${routine.routineId}`)
                    }}
                    size="lg"
                  >
                    <IconSettings size={20} />
                  </ActionIcon>
                </Group>
              </Card>
            )
          })}
        </Stack>
      </Stack>
    </Container>
  )
}
