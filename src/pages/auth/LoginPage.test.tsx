import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/AppProviders.tsx'
import { LoginPage } from './LoginPage.tsx'

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('../../lib/auth.ts', () => ({
  authKeys: { currentUser: ['auth', 'current-user'] },
  login: authMocks.login,
  getCurrentUser: authMocks.getCurrentUser,
}))

beforeEach(() => {
  authMocks.login.mockReset()
  authMocks.getCurrentUser.mockReset()
})

describe('LoginPage', () => {
  it('logs in and continues to the protected portal', async () => {
    authMocks.login.mockResolvedValue({ data: {} })
    authMocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      email_verified_at: '2026-08-09T10:00:00.000Z',
      is_superadmin: true,
      profile: { display_name: 'Ada Admin' },
      workspaces: [],
    })
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
})
