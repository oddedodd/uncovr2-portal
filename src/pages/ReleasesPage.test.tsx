import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import type { Release, ReleasePage } from '../lib/releases.ts'
import { ReleasesPage } from './ReleasesPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  getReleases: vi.fn(),
}))

vi.mock('../lib/releases.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/releases.ts')>()
  return { ...original, ...releaseMocks }
})

vi.mock('../lib/media.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/media.ts')>()
  return {
    ...original,
    getMediaDownloadUrls: vi.fn().mockResolvedValue(new Map()),
  }
})

const user: CurrentUser = {
  id: 'user-1',
  email: 'user@example.com',
  email_verified_at: '2026-08-09T10:00:00.000Z',
  is_superadmin: false,
  profile: { display_name: 'Label User' },
}

const workspace: Workspace = {
  id: 'label-1',
  type: 'organization',
  name: 'North Label',
  role: 'label_admin',
  status: 'active',
}

const baseRelease: Release = {
  id: 'release-1',
  owner: { type: 'organization', id: 'label-1' },
  type: 'single',
  status: 'draft',
  title: 'Signal',
  subtitle: null,
  description: null,
  release_date: null,
  upc: null,
  cover_media_id: null,
  cover_media: null,
  artists: [
    { artist_id: 'artist-1', name: 'Lumen', is_primary: true, position: 1 },
  ],
  editor_user_ids: [],
  created_at: '2026-08-09T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
}

const releasePage: ReleasePage = {
  data: [
    baseRelease,
    {
      ...baseRelease,
      id: 'release-2',
      owner: { type: 'artist', id: 'artist-1' },
      status: 'published',
      title: 'Aurora',
      editor_user_ids: ['user-1'],
    },
  ],
  pagination: {
    per_page: 25,
    next_cursor: null,
    previous_cursor: null,
    has_more: false,
  },
}

function renderReleases(
  contextUser: CurrentUser = user,
  contextWorkspace: Workspace = workspace,
) {
  const router = createMemoryRouter([
    {
      element: (
        <Outlet context={{ user: contextUser, workspace: contextWorkspace }} />
      ),
      children: [{ path: '/', element: <ReleasesPage /> }],
    },
  ])

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

beforeEach(() => {
  releaseMocks.getReleases.mockReset()
  releaseMocks.getReleases.mockResolvedValue(releasePage)
})

describe('ReleasesPage', () => {
  it('filters the visible release list by ownership and assignment', async () => {
    const browserUser = userEvent.setup()
    renderReleases()

    expect(await screen.findByText('Signal')).toBeVisible()
    expect(screen.getByText('Aurora')).toBeVisible()

    await browserUser.selectOptions(screen.getByLabelText('Eierskap'), 'artist')
    expect(screen.queryByText('Signal')).not.toBeInTheDocument()
    expect(screen.getByText('Aurora')).toBeVisible()

    await browserUser.selectOptions(
      screen.getByLabelText('Tildeling'),
      'not-assigned-to-me',
    )
    expect(
      screen.getByText('Ingen utgivelser matcher filtrene på denne siden.'),
    ).toBeVisible()
  })

  it('requests status filters through the releases API', async () => {
    const browserUser = userEvent.setup()
    renderReleases()

    await screen.findByText('Signal')
    await browserUser.selectOptions(
      screen.getByLabelText('Status'),
      'published',
    )

    await waitFor(() =>
      expect(releaseMocks.getReleases).toHaveBeenLastCalledWith(
        {},
        { status: 'published' },
      ),
    )
  })

  it('hides release creation from Artist User workspaces', async () => {
    renderReleases(user, {
      id: 'artist-1',
      type: 'artist',
      name: 'Lumen',
      role: 'artist_user',
      status: 'active',
    })

    expect(await screen.findByText('Signal')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Opprett utgivelse' }),
    ).not.toBeInTheDocument()
  })

  it('shows release creation to Artist Admin workspaces', async () => {
    renderReleases(user, {
      id: 'artist-1',
      type: 'artist',
      name: 'Lumen',
      role: 'artist_admin',
      status: 'active',
    })

    expect(
      await screen.findByRole('link', { name: 'Opprett utgivelse' }),
    ).toHaveAttribute('href', '/releases/new')
  })
})
