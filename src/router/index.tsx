import { createBrowserRouter } from 'react-router-dom'
import AppShellLayout from '../components/AppShellLayout'
import HomePage from '../pages/HomePage'
import RoutinesPage from '../pages/RoutinesPage'
import NewRoutinePage from '../pages/NewRoutinePage'
import RoutineDetailPage from '../pages/RoutineDetailPage'
import RecordActivityPage from '../pages/RecordActivityPage'
import NotFoundPage from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShellLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'routines', element: <RoutinesPage /> },
      { path: 'routines/new', element: <NewRoutinePage /> },
      { path: 'routines/:id', element: <RoutineDetailPage /> },
      { path: 'routines/:id/record', element: <RecordActivityPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
