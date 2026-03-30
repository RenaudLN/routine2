import { createBrowserRouter } from 'react-router-dom'
import AppShellLayout from '../components/AppShellLayout'
import HomePage from '../pages/HomePage'
import NewRoutinePage from '../pages/NewRoutinePage'
import RoutineDetailPage from '../pages/RoutineDetailPage'
import RecordActivityPage from '../pages/RecordActivityPage'
import HistoryPage from '../pages/HistoryPage'
import NotFoundPage from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShellLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'routines/new', element: <NewRoutinePage /> },
      { path: 'routines/:id', element: <RoutineDetailPage /> },
      { path: 'routines/:id/edit', element: <NewRoutinePage /> },
      { path: 'routines/:id/record', element: <RecordActivityPage /> },
      { path: 'history', element: <HistoryPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
], {
  basename: '/routine2/'
})
