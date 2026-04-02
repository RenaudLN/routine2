import '@mantine/charts/styles.css'
import '@mantine/dates/styles.css'
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
  SegmentedControl,
  Badge,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Calendar } from '@mantine/dates'
import {
  IconCalendar,
  IconChevronRight,
  IconActivity,
  IconEdit,
  IconTrash,
  IconPlus,
  IconList,
  IconCalendarEvent,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useActivityStore } from '../store/activityStore'
import { useRoutineStore } from '../store/routineStore'
import { todayISO } from '../store/activityStore'
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

export default function HistoryPage() {
  const navigate = useNavigate()
  const { activities, loading, fetchRecentActivities, deleteActivity } = useActivityStore()
  const { routines, fetchRoutines, fetchVersions } = useRoutineStore()
  
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [filterRoutineId, setFilterRoutineId] = useState<string | null>(null)

  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false)
  const [dayOpened, { open: openDay, close: closeDay }] = useDisclosure(false)
  
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<RoutineVersion | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const handleActivityClick = async (activity: Activity) => {
    setSelectedActivity(activity)
    setLoadingDetail(true)
    openDetail()
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
      closeDetail()
    }
  }

  useEffect(() => {
    // For now, fetch 60 days to cover current and partial previous months in calendar
    void fetchRecentActivities(60)
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
    const rid = Number(filterRoutineId)
    return activities.filter((a) => a.routineId === rid)
  }, [activities, filterRoutineId])

  // Group activities by date for calendar view
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const a of activities) {
      const list = map.get(a.date) ?? []
      list.push(a)
      map.set(a.date, list)
    }
    return map
  }, [activities])

  const today = todayISO()

  const activitiesForSelectedDay = useMemo(() => {
    if (!selectedDate) return []
    const iso = dayjs(selectedDate).format('YYYY-MM-DD')
    return activitiesByDate.get(iso) ?? []
  }, [selectedDate, activitiesByDate])

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setIsAddingNew(false)
    openDay()
  }

  const routineSelectData = useMemo(() => 
    routines.map(r => ({ value: String(r.routineId), label: r.title })),
    [routines]
  )

  return (
    <Container size="sm" p={0}>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={0}>
            <Title order={2} style={{ fontWeight: 800 }}>Activity History</Title>
            <Text c="dimmed" size="sm">Track your consistent progress</Text>
          </Stack>
          <SegmentedControl
            size="xs"
            radius="xl"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'calendar' | 'list')}
            data={[
              { label: <Group gap={4}><IconCalendarEvent size={14} />Calendar</Group>, value: 'calendar' },
              { label: <Group gap={4}><IconList size={14} />List</Group>, value: 'list' },
            ]}
          />
        </Group>

        {viewMode === 'calendar' ? (
          <Card radius="lg" padding="md" withBorder>
            <Stack align="center" gap="md">
              <Calendar
                size="md"
                getDayProps={(date) => ({
                  onClick: () => handleDayClick(new Date(date)),
                  style: {
                    position: 'relative',
                    height: 50,
                    width: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  },
                })}
                renderDay={(date) => {
                  const iso = dayjs(date).format('YYYY-MM-DD')
                  const dayActivities = activitiesByDate.get(iso) ?? []
                  const counts = new Map<number, number>()
                  dayActivities.forEach(a => counts.set(a.routineId, (counts.get(a.routineId) || 0) + 1))
                  
                  return (
                    <Stack gap={2} align="center" style={{ width: '100%' }}>
                      <Text size="sm">{dayjs(date).date()}</Text>
                      <Group gap={2} justify="center" wrap="nowrap" style={{ height: 16 }}>
                        {Array.from(counts.entries()).slice(0, 3).map(([rid, count]) => (
                          <Badge 
                            key={rid} 
                            variant="filled" 
                            color={colorByRoutineId.get(rid) || 'gray'} 
                            size="xs" 
                            p={0}
                            circle
                            style={{ width: 14, height: 14, minWidth: 14, fontSize: 8 }}
                          >
                            {count}
                          </Badge>
                        ))}
                        {dayActivities.length > 3 && <Text size="10px" c="dimmed">+</Text>}
                      </Group>
                    </Stack>
                  )
                }}
              />
            </Stack>
          </Card>
        ) : (
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
                placeholder="Filter"
                data={filterOptions}
                value={filterRoutineId ?? 'all'}
                onChange={setFilterRoutineId}
                clearable={false}
                radius="md"
                w={140}
              />
            </Group>

            {loading && <Group justify="center" py="xl"><Loader variant="dots" /></Group>}

            {!loading && filteredActivities.length === 0 && (
              <Card radius="lg" padding="xl" withBorder style={{ borderStyle: 'dashed', textAlign: 'center' }}>
                <Text c="dimmed" size="sm">No activities found.</Text>
              </Card>
            )}

            <Stack gap="sm">
              {filteredActivities.map((activity) => {
                const routineTitle = routineTitleById.get(activity.routineId) ?? `Routine ${activity.routineId}`
                const isToday = activity.date === today
                return (
                  <Card key={activity.id ?? activity.createdAt.getTime()} padding="md" radius="md" onClick={() => handleActivityClick(activity)} style={{ cursor: 'pointer' }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap={4}>
                        <Text fw={700} size="sm">{routineTitle}</Text>
                        <Group gap={4} c="dimmed">
                          <IconCalendar size={12} />
                          <Text size="xs" fw={500}>{isToday ? 'Today' : formatDateLabel(activity.date)}</Text>
                        </Group>
                      </Stack>
                      {/* @ts-expect-error dimmed not defined on mantine types*/}
                      <IconChevronRight size={18} c="dimmed" />
                    </Group>
                  </Card>
                )
              })}
            </Stack>
          </Stack>
        )}

        {/* ── Day Details Modal ─────────────────────────────────── */}
        <Modal
          opened={dayOpened}
          onClose={closeDay}
          title={
            <Group gap="sm">
               <ThemeIcon variant="light" color="indigo" radius="md">
                  <IconCalendar size={18} />
               </ThemeIcon>
               <Title order={4}>
                {selectedDate ? dayjs(selectedDate).format('MMMM D, YYYY') : 'Day Details'}
              </Title>
            </Group>
          }
          size="md"
          radius="lg"
          centered
        >
          <Stack gap="md">
            <Group justify="space-between">
               <Text size="sm" fw={700} c="dimmed">Activities</Text>
               {!isAddingNew && (
                 <Button 
                  size="compact-xs" 
                  variant="light" 
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setIsAddingNew(true)}
                 >
                   Add New
                 </Button>
               )}
            </Group>

            {isAddingNew ? (
               <Stack gap="xs" p="sm" bg="var(--mantine-color-gray-0)" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                 <Text size="xs" fw={700}>SELECT ROUTINE</Text>
                 <Select
                   placeholder="Pick a routine"
                   data={routineSelectData}
                   onChange={(val) => {
                     if (val) {
                       const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
                       navigate(`/routines/${val}/record?date=${dateStr}`)
                     }
                   }}
                   searchable
                 />
                 <Button variant="subtle" size="xs" onClick={() => setIsAddingNew(false)}>Cancel</Button>
               </Stack>
            ) : (
              <>
                {activitiesForSelectedDay.length === 0 ? (
                  <Box py="xl" style={{ textAlign: 'center' }}>
                    <Text c="dimmed" size="sm">No activities recorded for this day.</Text>
                  </Box>
                ) : (
                  <Stack gap="xs">
                    {activitiesForSelectedDay.map((a) => (
                      <Card 
                        key={a.id ?? a.createdAt.getTime()} 
                        withBorder 
                        padding="sm" 
                        radius="md" 
                        onClick={() => {
                          closeDay()
                          handleActivityClick(a)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Group justify="space-between">
                          <Text size="sm" fw={600}>
                            {routineTitleById.get(a.routineId) ?? `Routine ${a.routineId}`}
                          </Text>
                          {/* @ts-expect-error dimmed not defined on mantine types */}
                          <IconChevronRight size={16} c="dimmed" />
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Modal>

        {/* ── Activity Detail Modal ─────────────────────────────── */}
        <Modal
          opened={detailOpened}
          onClose={closeDetail}
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
                  onClick={() => {
                    if (selectedActivity.id) {
                      void handleDelete(selectedActivity.id)
                    }
                  }}
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
