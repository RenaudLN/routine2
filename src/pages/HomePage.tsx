import { Button, Stack, Text, Title } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <Stack align="center" mt="xl" gap="md">
      <Title>Welcome to Routine Tracker</Title>
      <Text c="dimmed" ta="center" maw={480}>
        Build and track your personal routines — all stored locally on your device.
      </Text>
      <Button size="md" onClick={() => navigate('/routines')}>
        View My Routines
      </Button>
    </Stack>
  )
}
