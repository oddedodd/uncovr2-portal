import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api.ts'
import { RequireAuth } from './RequireAuth.tsx'

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

describe('RequireAuth', () => {
  it('moves an unauthenticated request to the expired-session state', async () => {
    const router = createMemoryRouter(
      [
        {
          element: <RequireAuth />,
          children: [{ path: '/', element: <h1>Beskyttet</h1> }],
        },
        { path: '/session-expired', element: <h1>Ingen aktiv økt</h1> },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', { name: 'Ingen aktiv økt' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/session-expired')
  })
})
