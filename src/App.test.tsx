import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProviders } from './app/AppProviders.tsx'
import { PortalLayout } from './components/PortalLayout.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'

describe('portal shell', () => {
  it('renders the dashboard with accessible navigation', () => {
    const testRouter = createMemoryRouter([
      {
        path: '/',
        element: <PortalLayout />,
        children: [{ index: true, element: <DashboardPage /> }],
      },
    ])

    render(
      <AppProviders>
        <RouterProvider router={testRouter} />
      </AppProviders>,
    )

    expect(
      screen.getByRole('heading', { name: 'Arbeidsflaten for Uncovr.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Hovednavigasjon' }),
    ).toBeVisible()
  })
})
