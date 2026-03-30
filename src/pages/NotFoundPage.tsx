import { Button, Stack, Title, Text } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Stack align="center" mt="xl">
      <Title>404 — Page Not Found</Title>
      <Text c="dimmed">The page you are looking for does not exist.</Text>
      <Button onClick={() => navigate('/')}>Go Home</Button>
    </Stack>
  )
}
