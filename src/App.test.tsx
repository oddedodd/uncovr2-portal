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
    },
  }),
}))

vi.mock('./features/auth/useWorkspaces.ts', () => ({
  useWorkspaces: () => ({
    data: [
      {
        id: 'artist-1',
        type: 'artist',
        name: 'Lumen',
        role: 'artist_admin',
        status: 'active',
      },
    ],
    error: null,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('./lib/artists.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('./lib/artists.ts')>()
  return {
    ...original,
    getArtist: () =>
      Promise.resolve({
        id: 'artist-1',
        status: 'active',
        profile: {
          name: 'Lumen',
          biography: null,
          website_url: null,
          logo_media_id: null,
          logo_media: null,
          image_media_id: null,
          image_media: null,
        },
        created_at: '2026-08-09T10:00:00.000Z',
        updated_at: '2026-08-09T10:00:00.000Z',
      }),
  }
})

describe('portal shell', () => {
  it('renders the selected workspace with accessible navigation', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Lumen' })).toBeVisible()
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
