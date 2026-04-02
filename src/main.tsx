import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, ColorSchemeScript } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { theme } from './theme'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
)
