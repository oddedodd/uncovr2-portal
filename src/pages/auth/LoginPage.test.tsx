import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/AppProviders.tsx'
import { LoginPage } from './LoginPage.tsx'

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  getCurrentWorkspaces: vi.fn(),
}))

vi.mock('../../lib/auth.ts', () => ({
  authKeys: {
    currentUser: ['auth', 'current-user'],
    workspaces: ['auth', 'workspaces'],
  },
  login: authMocks.login,
  getCurrentWorkspaces: authMocks.getCurrentWorkspaces,
}))

beforeEach(() => {
  authMocks.login.mockReset()
  authMocks.getCurrentWorkspaces.mockReset()
})

describe('LoginPage', () => {
  it('logs in and continues to the protected portal', async () => {
    authMocks.login.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'ada@example.com',
          email_verified_at: '2026-08-09T10:00:00.000Z',
          is_superadmin: true,
          profile: { display_name: 'Ada Admin' },
        },
        session: {},
        authentication: { type: 'session' },
      },
    })
    authMocks.getCurrentWorkspaces.mockResolvedValue([])
    const router = createMemoryRouter(
      [
        { path: '/login', element: <LoginPage /> },
        { path: '/', element: <h1>Portaloversikt</h1> },
      ],
      { initialEntries: ['/login'] },
    )
    const user = userEvent.setup()

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    await user.type(
      screen.getByRole('textbox', { name: 'E-post' }),
      'ada@example.com',
    )
    await user.type(screen.getByLabelText('Passord'), 'a secure passphrase')
    await user.click(screen.getByRole('button', { name: 'Logg inn' }))

    expect(authMocks.login).toHaveBeenCalledWith(
      'ada@example.com',
      'a secure passphrase',
    )
    expect(
      await screen.findByRole('heading', { name: 'Portaloversikt' }),
    ).toBeVisible()
  })

  it('returns an invited user to the acceptance link after login', async () => {
    authMocks.login.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'artist-admin@example.com',
          email_verified_at: '2026-08-09T10:00:00.000Z',
          is_superadmin: false,
          profile: { display_name: 'Artist Admin' },
        },
        session: {},
        authentication: { type: 'session' },
      },
    })
    authMocks.getCurrentWorkspaces.mockResolvedValue([])
    const returnTo = '/artist-invitations/accept?token=artist-invite-token'
    const loginPath = `/login?return_to=${encodeURIComponent(returnTo)}`
    const router = createMemoryRouter(
      [
        { path: '/login', element: <LoginPage /> },
        { path: '/artist-invitations/accept', element: <h1>Invitasjon</h1> },
      ],
      { initialEntries: [loginPath] },
    )
    const user = userEvent.setup()

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(screen.getByText('Invitasjonen er tatt vare på')).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: 'E-post' }),
      'artist-admin@example.com',
    )
    await user.type(screen.getByLabelText('Passord'), 'a secure passphrase')
    await user.click(screen.getByRole('button', { name: 'Logg inn' }))

    expect(
      await screen.findByRole('heading', { name: 'Invitasjon' }),
    ).toBeVisible()
    expect(router.state.location.search).toBe('?token=artist-invite-token')
  })
})
