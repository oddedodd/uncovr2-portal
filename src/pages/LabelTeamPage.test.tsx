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
const artistTeamMocks = vi.hoisted(() => ({
  getArtistMembers: vi.fn(),
  inviteArtistMember: vi.fn(),
  updateArtistMember: vi.fn(),
  removeArtistMember: vi.fn(),
}))

vi.mock('../lib/organizationTeam.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../lib/organizationTeam.ts')>()
  return { ...original, ...teamMocks }
})

vi.mock('../lib/artistTeam.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/artistTeam.ts')>()
  return { ...original, ...artistTeamMocks }
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
const artistMember = {
  id: 'artist-membership-1',
  artist_id: 'artist-1',
  user: {
    id: 'artist-user-1',
    email: 'artist-member@example.com',
    display_name: 'Artist Member',
  },
  role: 'artist_user',
  status: 'active',
}

beforeEach(() => {
  Object.values(teamMocks).forEach((mock) => mock.mockReset())
  Object.values(artistTeamMocks).forEach((mock) => mock.mockReset())
  teamMocks.getOrganizationMembers.mockResolvedValue([member])
  teamMocks.updateOrganizationMember.mockResolvedValue({
    ...member,
    role: 'label_admin',
  })
  artistTeamMocks.getArtistMembers.mockResolvedValue([artistMember])
  artistTeamMocks.inviteArtistMember.mockResolvedValue({
    id: 'artist-invitation-1',
    artist_id: 'artist-1',
    email: 'artist-user@example.com',
    role: 'artist_user',
    expires_at: '2026-08-10T10:00:00.000Z',
    last_sent_at: '2026-08-09T10:00:00.000Z',
    send_count: 1,
  })
  artistTeamMocks.updateArtistMember.mockResolvedValue({
    ...artistMember,
    role: 'artist_admin',
  })
  artistTeamMocks.removeArtistMember.mockResolvedValue({
    data: { message: 'Membership removed.' },
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

  it('lets Artist Admin invite members and change artist roles', async () => {
    renderTeam({
      id: 'artist-1',
      type: 'artist',
      name: 'Lumen',
      role: 'artist_admin',
      status: 'active',
    })
    const browserUser = userEvent.setup()

    expect(await screen.findByText('Artist Member')).toBeVisible()
    await browserUser.type(
      screen.getByRole('textbox', { name: 'E-post' }),
      'artist-user@example.com',
    )
    await browserUser.selectOptions(
      screen.getByRole('combobox', { name: 'Rolle' }),
      'artist_user',
    )
    await browserUser.click(
      screen.getByRole('button', { name: 'Send invitasjon' }),
    )
    await browserUser.selectOptions(
      screen.getByRole('combobox', {
        name: 'Rolle for artist-member@example.com',
      }),
      'artist_admin',
    )

    expect(artistTeamMocks.inviteArtistMember).toHaveBeenCalledWith(
      'artist-1',
      { email: 'artist-user@example.com', role: 'artist_user' },
    )
    expect(artistTeamMocks.updateArtistMember).toHaveBeenCalledWith(
      'artist-1',
      'artist-membership-1',
      { role: 'artist_admin' },
    )
  })

  it('lets Artist Admin confirm removal of artist members', async () => {
    renderTeam({
      id: 'artist-1',
      type: 'artist',
      name: 'Lumen',
      role: 'artist_admin',
      status: 'active',
    })
    const browserUser = userEvent.setup()

    await screen.findByText('Artist Member')
    await browserUser.click(screen.getByRole('button', { name: 'Fjern' }))
    await browserUser.click(
      screen.getByRole('button', { name: 'Bekreft fjerning' }),
    )

    expect(artistTeamMocks.removeArtistMember).toHaveBeenCalledWith(
      'artist-1',
      'artist-membership-1',
    )
  })

  it('blocks Artist User from direct team administration routes', () => {
    renderTeam({
      id: 'artist-1',
      type: 'artist',
      name: 'Lumen',
      role: 'artist_user',
      status: 'active',
    })

    expect(
      screen.getByRole('heading', {
        name: 'Dette arbeidsområdet er ikke tilgjengelig.',
      }),
    ).toBeVisible()
    expect(artistTeamMocks.getArtistMembers).not.toHaveBeenCalled()
  })
})
