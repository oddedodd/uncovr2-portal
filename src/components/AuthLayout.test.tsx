import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthLayout } from './AuthLayout.tsx'

describe('AuthLayout', () => {
  it('shows the supplied Uncovr logo with a minimal form surface', () => {
    const router = createMemoryRouter(
      [
        {
          element: <AuthLayout />,
          children: [
            { path: '/login', element: <form aria-label="Logg inn" /> },
          ],
        },
      ],
      { initialEntries: ['/login'] },
    )

    render(<RouterProvider router={router} />)

    const logoLink = screen.getByRole('link', {
      name: 'Uncovr admin, forsiden',
    })
    expect(logoLink.querySelector('img')).toHaveAttribute(
      'src',
      '/uncovr-logo.png',
    )
    expect(screen.getByRole('form', { name: 'Logg inn' })).toBeVisible()
    expect(
      screen.queryByText('Musikken har en historie.'),
    ).not.toBeInTheDocument()
  })
})
