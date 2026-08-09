import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api.ts'
import { InvitationEntryPage } from './InvitationEntryPage.tsx'

vi.mock('../features/auth/useCurrentUser.ts', () => ({
  useCurrentUser: () => ({
    isPending: false,
    isError: true,
    error: new ApiError(
      401,
      'unauthenticated',
      'Authentication is required.',
      'bd7f435f-0ce3-485a-94bd-7db8473d8b40',
    ),
  }),
}))

describe('InvitationEntryPage', () => {
  it('explains account creation before asking for credentials and retains the token', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/artist-invitations/accept',
          element: (
            <InvitationEntryPage kind="artist">
              <h1>Godta invitasjonen</h1>
            </InvitationEntryPage>
          ),
        },
        { path: '/register', element: <h1>Registrering</h1> },
      ],
      {
        initialEntries: [
          '/artist-invitations/accept?token=artist-invite-token',
        ],
      },
    )
    const user = userEvent.setup()

    render(<RouterProvider router={router} />)

    expect(
      screen.getByRole('heading', { name: 'Du er invitert til Uncovr' }),
    ).toBeVisible()
    expect(screen.getByText(/oppretter ikke en brukerkonto/)).toBeVisible()
    await user.click(
      screen.getByRole('link', { name: 'Opprett konto og fortsett' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Registrering' }),
    ).toBeVisible()
    expect(router.state.location.search).toBe(
      '?return_to=%2Fartist-invitations%2Faccept%3Ftoken%3Dartist-invite-token',
    )
  })
})
