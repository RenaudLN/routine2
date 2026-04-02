import {
  AppShell,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
  ThemeIcon,
  ActionIcon,
  useMantineColorScheme,
  Box,
} from '@mantine/core'
import { IconHome, IconPlus, IconHistory, IconSun, IconMoon } from '@tabler/icons-react'
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
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        flex: 1,
        transition: 'all 0.2s ease',
        transform: active ? 'translateY(-2px)' : 'none',
      }}
    >
      <Stack gap={4} align="center">
        <Box
          style={{
            color: active ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-dimmed)',
            transition: 'color 0.2s ease',
          }}
        >
          {item.icon}
        </Box>
        <Text
          size="xs"
          fw={active ? 600 : 400}
          c={active ? 'var(--mantine-primary-color-filled)' : 'dimmed'}
          style={{ transition: 'color 0.2s ease' }}
        >
          {item.label}
        </Text>
      </Stack>
    </UnstyledButton>
  )
}

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const dark = colorScheme === 'dark'

  return (
    <ActionIcon
      variant="subtle"
      color={dark ? 'yellow' : 'blue'}
      onClick={() => toggleColorScheme()}
      title="Toggle color scheme"
      size="lg"
      radius="md"
    >
      {dark ? <IconSun size={20} stroke={1.5} /> : <IconMoon size={20} stroke={1.5} />}
    </ActionIcon>
  )
}

export default function AppShellLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <AppShell
      header={{ height: "calc(60px + env(safe-area-inset-top))" }}
      footer={{ height: 'calc(76px + env(safe-area-inset-bottom))' }}
      padding="md"
    >
      <AppShell.Header
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'rgba(var(--mantine-color-body-rgb), 0.8)',
          backdropFilter: "blur(10px)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <ThemeIcon variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} size="md" radius="md">
               <IconHistory size={18} />
            </ThemeIcon>
            <Title order={4} style={{ letterSpacing: '-0.5px', fontWeight: 800 }}>
              ROUTINE<span style={{ color: 'var(--mantine-primary-color-filled)' }}>2</span>
            </Title>
          </Group>
          <ThemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'rgba(var(--mantine-color-body-rgb), 0.8)',
          backdropFilter: "blur(10px)",
          paddingTop: "env(safe-area-inset-top)",
          height: 'auto',
        }}
      >
        <Group h={76} px="md" justify="space-around" align="center" gap={0}>
          {/* Home */}
          <BottomNavButton
            item={navItems[0]}
            active={location.pathname === '/'}
            onClick={() => navigate('/')}
          />

          {/* New Routine — centre action */}
          <UnstyledButton
            onClick={() => navigate('/routines/new')}
            style={{
              flex: 1,
              marginTop: -30,
              zIndex: 10,
            }}
          >
            <Stack gap={4} align="center">
              <ThemeIcon
                variant="gradient"
                gradient={{ from: 'indigo', to: 'cyan' }}
                size={54}
                radius="xl"
                style={{
                  border: '4px solid var(--mantine-color-body)',
                }}
              >
                <IconPlus size={28} stroke={2.5} />
              </ThemeIcon>
              <Text
                size="xs"
                fw={600}
                c="var(--mantine-primary-color-filled)"
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
