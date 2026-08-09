import { render, screen } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CurrentUser } from '../lib/auth.ts'
import { RequireSuperadmin } from './RequireSuperadmin.tsx'

function renderProtected(user: CurrentUser) {
  const router = createMemoryRouter(
    [
      {
        element: <Outlet context={{ user }} />,
        children: [
          {
            path: '/platform',
            element: (
              <RequireSuperadmin>
                <h1>Superadminverktøy</h1>
              </RequireSuperadmin>
            ),
          },
        ],
      },
    ],
    { initialEntries: ['/platform'] },
  )

  render(<RouterProvider router={router} />)
}

const user: CurrentUser = {
  id: 'user-1',
  email: 'member@example.com',
  email_verified_at: '2026-08-09T10:00:00.000Z',
  is_superadmin: false,
  profile: { display_name: 'Member' },
  workspaces: [],
}

describe('RequireSuperadmin', () => {
  it('shows forbidden state to regular authenticated users', () => {
    renderProtected(user)

    expect(
      screen.getByRole('heading', {
        name: 'Dette arbeidsområdet er ikke tilgjengelig.',
      }),
    ).toBeVisible()
    expect(screen.queryByText('Superadminverktøy')).not.toBeInTheDocument()
  })

  it('renders protected tools for a superadmin', () => {
    renderProtected({ ...user, is_superadmin: true })

    expect(
      screen.getByRole('heading', { name: 'Superadminverktøy' }),
    ).toBeVisible()
  })
})
