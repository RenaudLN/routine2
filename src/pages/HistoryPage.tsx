import '@mantine/charts/styles.css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Rating,
  Select,
  Stack,
  Text,
  Title,
  Container,
  ThemeIcon,
  Box,
  Button,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { BarChart } from '@mantine/charts'
import { IconCalendar, IconChartBar, IconChevronRight, IconActivity, IconEdit, IconTrash } from '@tabler/icons-react'
import { useActivityStore } from '../store/activityStore'
import { useRoutineStore } from '../store/routineStore'
import { daysAgoISO, todayISO } from '../store/activityStore'
import type { Activity, RoutineVersion } from '../types'

/** Mantine theme color palette to cycle through for each routine. */
const ROUTINE_COLORS = [
  'indigo.6',
  'cyan.6',
  'violet.6',
  'teal.6',
  'orange.6',
  'pink.6',
  'blue.6',
  'green.6',
  'red.6',
  'yellow.6',
]

/** Format YYYY-MM-DD as a short label like "Mar 30". */
function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/** Build the array of the last `days` ISO date strings, oldest first. */
function buildDateRange(days: number): string[] {
  return Array.from({ length: days }, (_, i) => daysAgoISO(days - 1 - i))
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { activities, loading, fetchRecentActivities, deleteActivity } = useActivityStore()
  const { routines, fetchRoutines, fetchVersions } = useRoutineStore()
  const [filterRoutineId, setFilterRoutineId] = useState<string | null>(null)

  const [opened, { open, close }] = useDisclosure(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<RoutineVersion | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleActivityClick = async (activity: Activity) => {
    setSelectedActivity(activity)
    setLoadingDetail(true)
    open()
    try {
      const versions = await fetchVersions(activity.routineId)
      const version = versions.find((v) => v.version === activity.routineVersion)
      setSelectedVersion(version ?? null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      await deleteActivity(id)
      close()
    }
  }

  useEffect(() => {
    void fetchRecentActivities(30)
    if (routines.length === 0) void fetchRoutines()
  }, [fetchRecentActivities, fetchRoutines, routines.length])

  // Map routineId -> title from the latest versions
  const routineTitleById = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of routines) map.set(r.routineId, r.title)
    return map
  }, [routines])

  // Determine which routineIds appear in the loaded activities
  const activeRoutineIds = useMemo(() => {
    const ids = new Set<number>()
    for (const a of activities) ids.add(a.routineId)
    return Array.from(ids).sort((a, b) => a - b)
  }, [activities])

  // Assign a stable color to each routineId
  const colorByRoutineId = useMemo(() => {
    const map = new Map<number, string>()
    activeRoutineIds.forEach((id, i) => {
      map.set(id, ROUTINE_COLORS[i % ROUTINE_COLORS.length])
    })
    return map
  }, [activeRoutineIds])

  // Build chart data: one entry per day, with a key per routineId
  const chartData = useMemo(() => {
    const dateRange = buildDateRange(30)
    // Group activity counts by date + routineId
    const countMap = new Map<string, Map<number, number>>()
    for (const a of activities) {
      if (!countMap.has(a.date)) countMap.set(a.date, new Map())
      const dayMap = countMap.get(a.date)!
      dayMap.set(a.routineId, (dayMap.get(a.routineId) ?? 0) + 1)
    }
    return dateRange.map((date) => {
      const entry: Record<string, string | number> = { date: formatDateLabel(date) }
      for (const id of activeRoutineIds) {
        entry[String(id)] = countMap.get(date)?.get(id) ?? 0
      }
      return entry
    })
  }, [activities, activeRoutineIds])

  // Series for the BarChart — one per active routine
  const series = useMemo(
    () =>
      activeRoutineIds.map((id) => ({
        name: String(id),
        label: routineTitleById.get(id) ?? `Routine ${id}`,
        color: colorByRoutineId.get(id) ?? 'indigo.6',
      })),
    [activeRoutineIds, routineTitleById, colorByRoutineId],
  )

  // Select options for the filter
  const filterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Routines' },
      ...activeRoutineIds.map((id) => ({
        value: String(id),
        label: routineTitleById.get(id) ?? `Routine ${id}`,
      })),
    ],
    [activeRoutineIds, routineTitleById],
  )

  // Filtered activity list
  const filteredActivities = useMemo(() => {
    if (!filterRoutineId || filterRoutineId === 'all') return activities
    return activities.filter((a) => a.routineId === Number(filterRoutineId))
  }, [activities, filterRoutineId])

  const today = todayISO()

  return (
    <Container size="sm" p={0}>
      <Stack gap="xl">
        <Stack gap={0}>
          <Title order={2} style={{ fontWeight: 800 }}>Activity History</Title>
          <Text c="dimmed" size="sm">Review your progress over the last 30 days</Text>
        </Stack>

        {/* ── Chart ─────────────────────────────────────────────── */}
        <Card radius="lg" padding="lg">
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="indigo" size="sm">
                <IconChartBar size={16} />
              </ThemeIcon>
              <Text fw={700} size="sm">
                Activity Volume
              </Text>
            </Group>

            {loading && <Group justify="center" py="xl"><Loader variant="dots" /></Group>}

            {!loading && activities.length === 0 && (
              <Box py="xl" style={{ textAlign: 'center' }}>
                <Text c="dimmed" size="sm">
                  No activities recorded in the past 30 days.
                </Text>
              </Box>
            )}

            {!loading && activities.length > 0 && (
              <BarChart
                h={200}
                data={chartData}
                dataKey="date"
                type="stacked"
                series={series}
                withLegend
                legendProps={{ verticalAlign: 'bottom', height: 40 }}
                yAxisProps={{ allowDecimals: false, width: 30 }}
                xAxisProps={{ tick: { fontSize: 10 }, interval: 'preserveStartEnd' }}
                tickLine="y"
                withTooltip
                tooltipAnimationDuration={150}
                barProps={{ radius: [4, 4, 0, 0] }}
                gridAxis="none"
              />
            )}
          </Stack>
        </Card>

        {/* ── Activity list ─────────────────────────────────────── */}
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ThemeIcon variant="light" color="indigo" size="sm">
                <IconActivity size={16} />
              </ThemeIcon>
              <Text fw={700}>Logged Sessions</Text>
            </Group>
            <Select
              size="xs"
              placeholder="Filter by routine"
              data={filterOptions}
              value={filterRoutineId ?? 'all'}
              onChange={setFilterRoutineId}
              clearable={false}
              radius="md"
              w={160}
            />
          </Group>

          {loading && <Group justify="center" py="xl"><Loader variant="dots" /></Group>}

          {!loading && filteredActivities.length === 0 && (
            <Card radius="lg" padding="xl" withBorder style={{ borderStyle: 'dashed', textAlign: 'center' }}>
              <Text c="dimmed" size="sm">
                No activities found matching your filter.
              </Text>
            </Card>
          )}

          <Stack gap="sm">
            {filteredActivities.map((activity) => {
              const routineTitle =
                routineTitleById.get(activity.routineId) ?? `Routine ${activity.routineId}`
              const isToday = activity.date === today

              return (
                <Card
                  key={activity.id}
                  padding="md"
                  radius="md"
                  onClick={() => handleActivityClick(activity)}
                  style={{ cursor: 'pointer' }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={4}>
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={700} size="sm">
                          {routineTitle}
                        </Text>
                      </Group>
                      <Group gap={4} c="dimmed">
                        <IconCalendar size={12} />
                        <Text size="xs" fw={500}>
                          {isToday ? 'Today' : formatDateLabel(activity.date)}
                        </Text>
                      </Group>
                    </Stack>
                    <IconChevronRight size={18} c="dimmed" />
                  </Group>
                </Card>
              )
            })}
          </Stack>
        </Stack>

        <Modal
          opened={opened}
          onClose={close}
          title={
            <Group gap="sm">
               <ThemeIcon variant="light" color="indigo" radius="md">
                  <IconActivity size={18} />
               </ThemeIcon>
               <Title order={4}>
                {selectedVersion?.title ??
                  routineTitleById.get(selectedActivity?.routineId ?? 0) ??
                  'Activity Detail'}
              </Title>
            </Group>
          }
          size="lg"
          radius="lg"
          centered
        >
          {loadingDetail ? (
            <Group justify="center" py="xl"><Loader variant="dots" /></Group>
          ) : !selectedActivity ? (
            <Text>No activity selected</Text>
          ) : (
            <Stack gap="lg">
              <Group justify="space-between" bg="var(--mantine-color-gray-0)" p="md" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                <Stack gap={0}>
                  <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                    Date Recorded
                  </Text>
                  <Text fw={600}>{formatDateLabel(selectedActivity.date)}</Text>
                </Stack>
              </Group>

              <Stack gap="md">
                <Text size="sm" fw={700} c="indigo">FIELDS DATA</Text>
                {selectedVersion?.fields.map((field) => {
                  const val = selectedActivity.fieldValues.find(
                    (fv) => fv.fieldName === field.name,
                  )?.value

                  return (
                    <Card key={field.name} withBorder padding="sm" radius="md" bg="var(--mantine-color-body)">
                      <Stack gap={4}>
                        <Group justify="space-between">
                          <Text size="sm" fw={700}>
                            {field.name}
                          </Text>
                          {field.type === 'Rating' && typeof val === 'number' && (
                            <Rating value={val} count={field.ratingMax ?? 5} readOnly size="sm" />
                          )}
                        </Group>
                        {field.description && (
                          <Text size="xs" c="dimmed">
                            {field.description}
                          </Text>
                        )}
                        {field.type !== 'Rating' && (
                          <Text size="sm" fw={500}>{val === null || val === '' ? '—' : String(val)}</Text>
                        )}
                      </Stack>
                    </Card>
                  )
                })}
              </Stack>

              {!selectedVersion && (
                <Text size="sm" c="dimmed" fs="italic" ta="center">
                  Routine definition not found for this version.
                </Text>
              )}

              <Divider my="md" />
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => handleDelete(selectedActivity.id!)}
                >
                  Delete
                </Button>
                <Button
                  variant="light"
                  color="indigo"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => navigate(`/activities/${selectedActivity.id}/edit`)}
                >
                  Edit
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      </Stack>
    </Container>
  )
}
