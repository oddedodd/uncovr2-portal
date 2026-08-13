import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import { PlatformSearchPage } from './PlatformSearchPage.tsx'

const searchMocks = vi.hoisted(() => ({
  searchPlatformResource: vi.fn(),
}))

vi.mock('../lib/platformSearch.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../lib/platformSearch.ts')>()

  return {
    ...original,
    searchPlatformResource: searchMocks.searchPlatformResource,
  }
})

const emptyPagination = {
  per_page: 10,
  next_cursor: null,
  previous_cursor: null,
  has_more: false,
}

beforeEach(() => {
  searchMocks.searchPlatformResource.mockReset()
  searchMocks.searchPlatformResource.mockImplementation((resource: string) =>
    Promise.resolve({
      data:
        resource === 'users'
          ? [
              {
                id: 'user-1',
                email: 'ada@example.com',
                display_name: 'Ada Admin',
                is_superadmin: true,
                status: 'active',
                email_verified_at: '2026-08-09T10:00:00.000Z',
              },
            ]
          : [],
      pagination: emptyPagination,
    }),
  )
})

function renderSearch(initialEntry: string) {
  const router = createMemoryRouter(
    [{ path: '/search', element: <PlatformSearchPage /> }],
    { initialEntries: [initialEntry] },
  )

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('PlatformSearchPage', () => {
  it('searches all protected resource groups from the URL query', async () => {
    renderSearch('/search?q=ada')

    expect(
      await screen.findByRole('heading', { name: 'Ada Admin' }),
    ).toBeVisible()
    expect(searchMocks.searchPlatformResource).toHaveBeenCalledTimes(4)
    expect(searchMocks.searchPlatformResource).toHaveBeenCalledWith(
      'users',
      'ada',
      undefined,
      expect.any(AbortSignal),
    )
    expect(screen.getByText('ada@example.com')).toBeVisible()
    expect(screen.getAllByText('Ingen treff.')).toHaveLength(3)
  })

  it('does not call the API before the minimum search length is met', () => {
    renderSearch('/search?q=a')

    expect(screen.getByText('Skriv minst to tegn.')).toBeVisible()
    expect(searchMocks.searchPlatformResource).not.toHaveBeenCalled()
  })
})
