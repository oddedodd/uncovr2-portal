import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import { CreateArtistPage } from './CreateArtistPage.tsx'

const artistMocks = vi.hoisted(() => ({ onboardArtist: vi.fn() }))

vi.mock('../lib/artists.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/artists.ts')>()
  return { ...original, ...artistMocks }
})

const workspace: Workspace = {
  id: 'label-1',
  type: 'organization',
  name: 'North Label',
  role: 'label_admin',
  status: 'active',
}

const user: CurrentUser = {
  id: 'admin-1',
  email: 'label-admin@example.com',
  email_verified_at: '2026-08-09T10:00:00.000Z',
  is_superadmin: false,
  profile: { display_name: 'Label Admin' },
  workspaces: [workspace],
}

beforeEach(() => {
  artistMocks.onboardArtist.mockReset()
  artistMocks.onboardArtist.mockResolvedValue({
    artist: { profile: { name: 'Midnight Echo' } },
    administrator_invitation: { email: 'artist-admin@example.com' },
  })
})

describe('CreateArtistPage', () => {
  it('onboards the artist and first Artist Admin in one action', async () => {
    const router = createMemoryRouter(
      [
        {
          element: <Outlet context={{ user, workspace }} />,
          children: [{ path: '/artists/new', element: <CreateArtistPage /> }],
        },
      ],
      { initialEntries: ['/artists/new'] },
    )
    const browserUser = userEvent.setup()

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    await browserUser.type(
      screen.getByRole('textbox', { name: 'Artistnavn' }),
      'Midnight Echo',
    )
    await browserUser.type(
      screen.getByRole('textbox', {
        name: 'E-post til første Artist Admin',
      }),
      'artist-admin@example.com',
    )
    await browserUser.click(screen.getByRole('checkbox'))
    await browserUser.click(
      screen.getByRole('button', {
        name: 'Opprett artist og inviter admin',
      }),
    )

    expect(artistMocks.onboardArtist).toHaveBeenCalledWith('label-1', {
      artist: {
        name: 'Midnight Echo',
        biography: null,
        website_url: null,
      },
      administrator: { email: 'artist-admin@example.com' },
      relationship_type: 'managing_label',
      creator_role: null,
      confirmation: true,
    })
    expect(await screen.findByText('Artisten er opprettet')).toBeVisible()
  })
})
