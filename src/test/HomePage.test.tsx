import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import HomePage from '../pages/HomePage'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MantineProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </MantineProvider>,
  )
}

import { act } from 'react'

describe('HomePage', () => {
  it('renders the welcome heading', async () => {
    await act(async () => {
      renderWithProviders(<HomePage />)
    })
    expect(
      await screen.findByText(/my routines/i)
    ).toBeInTheDocument()
  })

  it('renders the CTA button', async () => {
    await act(async () => {
      renderWithProviders(<HomePage />)
    })
    expect(
      await screen.findByRole('button', { name: /create your first routine/i })
    ).toBeInTheDocument()
  })
})
