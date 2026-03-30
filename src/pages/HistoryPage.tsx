import '@mantine/charts/styles.css'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
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
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { BarChart } from '@mantine/charts'
import { IconCalendar } from '@tabler/icons-react'
import { useActivityStore } from '../store/activityStore'
import { useRoutineStore } from '../store/routineStore'
import { daysAgoISO, todayISO } from '../store/activityStore'
import type { Activity, RoutineVersion } from '../types'

/** Mantine theme color palette to cycle through for each routine. */
const ROUTINE_COLORS = [
  'blue.6',
  'teal.6',
  'violet.6',
  'orange.6',
  'pink.6',
  'cyan.6',
  'green.6',
  'red.6',
  'yellow.6',
  'indigo.6',
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
  const { activities, loading, fetchRecentActivities } = useActivityStore()
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
        color: colorByRoutineId.get(id) ?? 'blue.6',
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
    <Stack gap="xl">
      <Title order={2}>Activity History</Title>

      {/* ── Chart ─────────────────────────────────────────────── */}
      <Stack gap="xs">
        <Text fw={500} size="sm" c="dimmed">
          Last 30 days
        </Text>

        {loading && <Loader size="sm" />}

        {!loading && activities.length === 0 && (
          <Text c="dimmed" size="sm">
            No activities recorded in the past 30 days.
          </Text>
        )}

        {!loading && activities.length > 0 && (
          <BarChart
            h={240}
            data={chartData}
            dataKey="date"
            type="stacked"
            series={series}
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 40 }}
            yAxisProps={{ allowDecimals: false, width: 30 }}
            xAxisProps={{ tick: { fontSize: 11 }, interval: 'preserveStartEnd' }}
            tickLine="y"
            withTooltip
            tooltipAnimationDuration={150}
            barProps={{ radius: [0, 0, 0, 0] }}
          />
        )}
      </Stack>

      {/* ── Activity list ─────────────────────────────────────── */}
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={600}>Activities</Text>
          <Select
            size="xs"
            placeholder="Filter by routine"
            data={filterOptions}
            value={filterRoutineId ?? 'all'}
            onChange={setFilterRoutineId}
            clearable={false}
            w={200}
          />
        </Group>

        {loading && <Loader size="sm" />}

        {!loading && filteredActivities.length === 0 && (
          <Text c="dimmed" size="sm">
            No activities found.
          </Text>
        )}

        {filteredActivities.map((activity) => {
          const routineTitle =
            routineTitleById.get(activity.routineId) ?? `Routine ${activity.routineId}`
          const color = colorByRoutineId.get(activity.routineId) ?? 'blue'
          const isToday = activity.date === today

          return (
            <Card
              key={activity.id}
              padding="sm"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => handleActivityClick(activity)}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Badge color={color.split('.')[0]} variant="light" size="sm">
                    {routineTitle}
                  </Badge>
                  <Group gap={4} c="dimmed">
                    <IconCalendar size={13} />
                    <Text size="xs">
                      {isToday ? 'Today' : formatDateLabel(activity.date)}
                    </Text>
                  </Group>
                </Group>
                <Badge
                  size="xs"
                  variant="outline"
                  color={activity.status === 'complete' ? 'green' : 'gray'}
                >
                  {activity.status}
                </Badge>
              </Group>
            </Card>
          )
        })}
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title={
          <Title order={3}>
            {selectedVersion?.title ??
              routineTitleById.get(selectedActivity?.routineId ?? 0) ??
              'Activity Detail'}
          </Title>
        }
        size="lg"
      >
        {loadingDetail ? (
          <Loader size="sm" />
        ) : !selectedActivity ? (
          <Text>No activity selected</Text>
        ) : (
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text size="sm" fw={500} c="dimmed">
                  Date
                </Text>
                <Text>{formatDateLabel(selectedActivity.date)}</Text>
              </Stack>
              <Badge
                variant="outline"
                color={selectedActivity.status === 'complete' ? 'green' : 'gray'}
              >
                {selectedActivity.status}
              </Badge>
            </Group>

            <Divider />

            {selectedVersion?.fields.map((field) => {
              const val = selectedActivity.fieldValues.find(
                (fv) => fv.fieldName === field.name,
              )?.value

              return (
                <Stack key={field.name} gap={4}>
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      {field.name}
                    </Text>
                    {field.type === 'Rating' && typeof val === 'number' && (
                      <Rating value={val} count={field.ratingMax ?? 5} readOnly />
                    )}
                  </Group>
                  {field.description && (
                    <Text size="xs" c="dimmed">
                      {field.description}
                    </Text>
                  )}
                  {field.type !== 'Rating' && (
                    <Text size="sm">{val === null || val === '' ? '—' : String(val)}</Text>
                  )}
                </Stack>
              )
            })}

            {!selectedVersion && (
              <Text size="sm" c="dimmed" fs="italic">
                Routine definition not found for this version.
              </Text>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
