import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import { LabelTeamPage } from './LabelTeamPage.tsx'

const teamMocks = vi.hoisted(() => ({
  getOrganizationMembers: vi.fn(),
  inviteOrganizationMember: vi.fn(),
  updateOrganizationMember: vi.fn(),
  removeOrganizationMember: vi.fn(),
}))

vi.mock('../lib/organizationTeam.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../lib/organizationTeam.ts')>()
  return { ...original, ...teamMocks }
})

const member = {
  id: 'membership-1',
  organization_id: 'label-1',
  user: {
    id: 'user-1',
    email: 'member@example.com',
    display_name: 'Label Member',
  },
  role: 'label_user',
  status: 'active',
}

beforeEach(() => {
  Object.values(teamMocks).forEach((mock) => mock.mockReset())
  teamMocks.getOrganizationMembers.mockResolvedValue([member])
  teamMocks.updateOrganizationMember.mockResolvedValue({
    ...member,
    role: 'label_admin',
  })
})

describe('LabelTeamPage', () => {
  const labelAdminWorkspace: Workspace = {
    id: 'label-1',
    type: 'organization',
    name: 'North Label',
    role: 'label_admin',
    status: 'active',
  }
  const user: CurrentUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    email_verified_at: '2026-08-09T10:00:00.000Z',
    is_superadmin: false,
    profile: { display_name: 'Admin' },
  }

  function renderTeam(workspace: Workspace) {
    const router = createMemoryRouter(
      [
        {
          element: <Outlet context={{ user, workspace }} />,
          children: [{ path: '/team', element: <LabelTeamPage /> }],
        },
      ],
      { initialEntries: ['/team'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )
  }

  it('lists members and lets Label Admin change a role', async () => {
    const browserUser = userEvent.setup()
    renderTeam(labelAdminWorkspace)

    expect(await screen.findByText('Label Member')).toBeVisible()
    await browserUser.selectOptions(
      screen.getByRole('combobox', { name: 'Rolle for member@example.com' }),
      'label_admin',
    )

    expect(teamMocks.updateOrganizationMember).toHaveBeenCalledWith(
      'label-1',
      'membership-1',
      { role: 'label_admin' },
    )
  })

  it('blocks Label User from direct team administration routes', () => {
    renderTeam({ ...labelAdminWorkspace, role: 'label_user' })

    expect(
      screen.getByRole('heading', {
        name: 'Dette arbeidsområdet er ikke tilgjengelig.',
      }),
    ).toBeVisible()
    expect(teamMocks.getOrganizationMembers).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'Send invitasjon' }),
    ).not.toBeInTheDocument()
  })
})
