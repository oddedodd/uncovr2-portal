import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import { PlatformUserPage } from './PlatformUserPage.tsx'

const platformUserMocks = vi.hoisted(() => ({
  getPlatformUser: vi.fn(),
  correctMembershipRole: vi.fn(),
  updatePlatformUserStatus: vi.fn(),
}))

vi.mock('../lib/platformUsers.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../lib/platformUsers.ts')>()
  return { ...original, ...platformUserMocks }
})

beforeEach(() => {
  platformUserMocks.getPlatformUser.mockReset()
  platformUserMocks.correctMembershipRole.mockReset()
  platformUserMocks.updatePlatformUserStatus.mockReset()
  platformUserMocks.getPlatformUser.mockResolvedValue({
    id: 'user-1',
    email: 'ada@example.com',
    display_name: 'Ada Admin',
    is_superadmin: false,
    status: 'active',
    suspended_at: null,
    suspension_reason: null,
    email_verified_at: '2026-08-09T10:00:00.000Z',
    deletion_requested_at: null,
    anonymized_at: null,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-09T10:00:00.000Z',
    memberships: {
      organizations: [
        {
          id: 'membership-1',
          role: 'label_admin',
          status: 'active',
          organization: {
            id: 'label-1',
            status: 'active',
            name: 'North Label',
            artists: [
              {
                relationship_id: 'relationship-1',
                relationship_type: 'managing_label',
                id: 'artist-1',
                status: 'active',
                name: 'Northern Echo',
              },
            ],
            releases: [
              {
                id: 'release-1',
                title: 'First Light',
                type: 'album',
                status: 'draft',
                release_date: null,
              },
            ],
          },
        },
      ],
      artists: [],
    },
    release_editor_assignments: [],
  })
  platformUserMocks.correctMembershipRole.mockResolvedValue({
    id: 'membership-1',
    role: 'label_user',
  })
})

describe('PlatformUserPage', () => {
  it('shows memberships and their resource hierarchy', async () => {
    const router = createMemoryRouter(
      [{ path: '/users/:userId', element: <PlatformUserPage /> }],
      { initialEntries: ['/users/user-1'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Ada Admin' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'North Label' })).toHaveAttribute(
      'href',
      '/labels/label-1',
    )
    expect(screen.getByText('Northern Echo')).toBeVisible()
    expect(screen.getByText('First Light')).toBeVisible()
    expect(platformUserMocks.getPlatformUser).toHaveBeenCalledWith(
      'user-1',
      expect.any(AbortSignal),
    )
  })

  it('requires audit context before correcting a membership role', async () => {
    const router = createMemoryRouter(
      [{ path: '/users/:userId', element: <PlatformUserPage /> }],
      { initialEntries: ['/users/user-1'] },
    )
    const user = userEvent.setup()

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    await user.click(
      await screen.findByRole('button', { name: 'Korriger rolle' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ny rolle' }),
      'label_user',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Begrunnelse' }),
      'Correcting an imported membership role.',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Bekreft med bruker-ID' }),
      'user-1',
    )
    await user.click(
      screen.getByRole('button', { name: 'Bekreft rollekorrigering' }),
    )

    expect(platformUserMocks.correctMembershipRole).toHaveBeenCalledWith(
      'user-1',
      'membership-1',
      'organization',
      {
        value: 'label_user',
        reason: 'Correcting an imported membership role.',
        confirmation: 'user-1',
      },
    )
  })
})
