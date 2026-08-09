import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import { AcceptArtistInvitationPage } from './AcceptArtistInvitationPage.tsx'

const artistMocks = vi.hoisted(() => ({ acceptArtistInvitation: vi.fn() }))

vi.mock('../lib/artists.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/artists.ts')>()
  return { ...original, ...artistMocks }
})

beforeEach(() => {
  artistMocks.acceptArtistInvitation.mockReset()
  artistMocks.acceptArtistInvitation.mockResolvedValue({
    membership_id: 'membership-1',
    artist_id: 'artist-1',
    role: 'artist_admin',
  })
})

describe('AcceptArtistInvitationPage', () => {
  it('lets the signed-in recipient accept the artist role', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/artist-invitations/accept',
          element: <AcceptArtistInvitationPage />,
        },
      ],
      {
        initialEntries: [
          '/artist-invitations/accept?token=artist-invite-token',
        ],
      },
    )
    const browserUser = userEvent.setup()

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    await browserUser.click(
      screen.getByRole('button', { name: 'Godta invitasjonen' }),
    )

    expect(artistMocks.acceptArtistInvitation).toHaveBeenCalledWith(
      'artist-invite-token',
    )
    expect(await screen.findByText('Invitasjonen er godtatt')).toBeVisible()
  })
})
