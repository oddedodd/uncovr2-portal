import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from './app/AppProviders.tsx'
import { PortalLayout } from './components/PortalLayout.tsx'
import { navigationForRole } from './lib/portal.ts'
import { DashboardPage } from './pages/DashboardPage.tsx'

vi.mock('./features/auth/useCurrentUser.ts', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'user-1',
      email: 'ada@example.com',
      email_verified_at: '2026-08-09T10:00:00.000Z',
      is_superadmin: false,
      profile: { display_name: 'Ada Artist' },
      workspaces: [
        {
          id: 'artist-1',
          type: 'artist',
          name: 'Lumen',
          role: 'artist_admin',
          status: 'active',
        },
      ],
    },
  }),
}))

describe('portal shell', () => {
  it('renders the selected workspace with accessible navigation', () => {
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
      screen.getByRole('heading', { name: 'Hei, Ada Artist.' }),
    ).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Arbeidsområde' })).toHaveValue(
      'artist-1',
    )
    expect(
      screen.getByRole('navigation', { name: 'Hovednavigasjon' }),
    ).toBeVisible()
  })

  it('shows navigation according to role without treating it as authorization', () => {
    expect(navigationForRole('label_user').map((item) => item.label)).toEqual([
      'Oversikt',
      'Artister',
      'Utgivelser',
    ])
    expect(navigationForRole('artist_user').map((item) => item.label)).toEqual([
      'Oversikt',
      'Utgivelser',
    ])
  })
})
