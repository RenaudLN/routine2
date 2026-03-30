import {
  AppShell,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core'
import { IconHome, IconList, IconPlus, IconHistory } from '@tabler/icons-react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

interface BottomNavItem {
  label: string
  icon: React.ReactNode
  path: string
}

const navItems: BottomNavItem[] = [
  { label: 'Home', icon: <IconHome size={22} />, path: '/' },
  { label: 'History', icon: <IconHistory size={22} />, path: '/history' },
]

function BottomNavButton({
  item,
  active,
  onClick,
}: {
  item: BottomNavItem
  active: boolean
  onClick: () => void
}) {
  const theme = useMantineTheme()
  return (
    <UnstyledButton
      onClick={onClick}
      style={{ flex: 1 }}
    >
      <Stack gap={2} align="center">
        <ThemeIcon
          variant={active ? 'filled' : 'subtle'}
          color={active ? theme.primaryColor : 'gray'}
          size="md"
          radius="md"
        >
          {item.icon}
        </ThemeIcon>
        <Text
          size="xs"
          fw={active ? 600 : 400}
          c={active ? theme.primaryColor : 'dimmed'}
        >
          {item.label}
        </Text>
      </Stack>
    </UnstyledButton>
  )
}

export default function AppShellLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useMantineTheme()

  return (
    <AppShell
      header={{ height: 52 }}
      footer={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Title order={5} style={{ letterSpacing: '-0.3px' }}>
            Routine Tracker
          </Title>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer
        style={{
          borderTop: `1px solid var(--mantine-color-gray-2)`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <Group h={64} px="md" justify="space-around" align="center" gap={0}>
          {/* Home */}
          <BottomNavButton
            item={navItems[0]}
            active={location.pathname === '/'}
            onClick={() => navigate('/')}
          />

          {/* New Routine — centre action */}
          <UnstyledButton
            onClick={() => navigate('/routines/new')}
            style={{ flex: 1 }}
          >
            <Stack gap={2} align="center">
              <ThemeIcon
                variant="filled"
                color={theme.primaryColor}
                size={44}
                radius="xl"
                style={{
                  boxShadow: `0 4px 14px color-mix(in srgb, var(--mantine-primary-color-filled) 40%, transparent)`,
                  marginTop: -14,
                }}
              >
                <IconPlus size={22} />
              </ThemeIcon>
              <Text
                size="xs"
                fw={location.pathname === '/routines/new' ? 600 : 400}
                c={location.pathname === '/routines/new' ? theme.primaryColor : 'dimmed'}
              >
                New
              </Text>
            </Stack>
          </UnstyledButton>

          {/* History */}
          <BottomNavButton
            item={navItems[1]}
            active={location.pathname === '/history'}
            onClick={() => navigate('/history')}
          />
        </Group>
      </AppShell.Footer>
    </AppShell>
  )
}
