import { createBrowserRouter } from 'react-router-dom'
import AppShellLayout from '../components/AppShellLayout'
import HomePage from '../pages/HomePage'
import RoutinesPage from '../pages/RoutinesPage'
import RoutineDetailPage from '../pages/RoutineDetailPage'
import NotFoundPage from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShellLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'routines', element: <RoutinesPage /> },
      { path: 'routines/:id', element: <RoutineDetailPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
