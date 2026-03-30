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

describe('HomePage', () => {
  it('renders the welcome heading', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText(/welcome to routine tracker/i)).toBeInTheDocument()
  })

  it('renders the CTA button', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('button', { name: /view my routines/i })).toBeInTheDocument()
  })
})
