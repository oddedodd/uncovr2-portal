import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import type { ReleasePage, ReleaseSummary } from '../lib/releases.ts'
import { ReleasesPage } from './ReleasesPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  getReleases: vi.fn(),
}))

vi.mock('../lib/releases.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/releases.ts')>()
  return { ...original, ...releaseMocks }
})

// Mockes på hook-nivå: mediaDownloadQueryOptions kaller getMediaDownload
// internt i modulen, så en mock av eksporten ville ikke fanget den opp.
vi.mock('../features/media/useMediaUrl.ts', () => ({
  useMediaUrls: () => ({ urls: new Map<string, string>(), isPending: false }),
}))

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

const permissions = {
  can_update: true,
  can_submit: true,
  can_delete: true,
  can_approve: true,
  can_publish: true,
  can_manage_editors: true,
}

const baseRelease: ReleaseSummary = {
  id: 'release-1',
  owner: { type: 'organization', id: 'label-1' },
  type: 'single',
  status: 'draft',
  title: 'Signal',
  subtitle: null,
  release_date: null,
  cover_media_id: null,
  cover_media: null,
  artists: [
    { artist_id: 'artist-1', name: 'Lumen', is_primary: true, position: 1 },
  ],
  editors: [],
  editor_user_ids: [],
  permissions,
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
      editors: [{ user_id: 'user-1', display_name: 'Label User' }],
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
  contextWorkspace: Workspace | null = workspace,
) {
  const router = createMemoryRouter([
    {
      element: (
        <Outlet
          context={{
            user: contextUser,
            workspace: contextWorkspace ?? undefined,
          }}
        />
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
  it('filters the visible release list by ownership', async () => {
    const browserUser = userEvent.setup()
    renderReleases()

    expect(await screen.findByText('Signal')).toBeVisible()
    expect(screen.getByText('Aurora')).toBeVisible()

    await browserUser.selectOptions(screen.getByLabelText('Eierskap'), 'artist')
    expect(screen.queryByText('Signal')).not.toBeInTheDocument()
    expect(screen.getByText('Aurora')).toBeVisible()
  })

  it('asks Laravel for assigned releases instead of filtering the page', async () => {
    const browserUser = userEvent.setup()
    renderReleases()

    await screen.findByText('Signal')
    await browserUser.selectOptions(
      screen.getByLabelText('Tildeling'),
      'assigned-to-me',
    )

    // Listen er markørpaginert, så tildelingen må filtreres av API-et. Et
    // klientside-filter kunne gitt en helt tom side.
    await waitFor(() =>
      expect(releaseMocks.getReleases).toHaveBeenLastCalledWith(
        {},
        {
          assigned_to_me: true,
          owner_id: 'label-1',
          owner_type: 'organization',
        },
        expect.any(AbortSignal),
      ),
    )
  })

  it('defaults Artist User workspaces to their assigned releases', async () => {
    renderReleases(user, {
      id: 'artist-1',
      type: 'artist',
      name: 'Lumen',
      role: 'artist_user',
      status: 'active',
    })

    await screen.findByText('Signal')

    expect(releaseMocks.getReleases).toHaveBeenLastCalledWith(
      {},
      { assigned_to_me: true, artist_id: 'artist-1' },
      expect.any(AbortSignal),
    )
    expect(screen.getByLabelText('Tildeling')).toHaveValue('assigned-to-me')
  })

  it('keeps Artist Admin workspaces on every release they may see', async () => {
    renderReleases(user, {
      id: 'artist-1',
      type: 'artist',
      name: 'Lumen',
      role: 'artist_admin',
      status: 'active',
    })

    await screen.findByText('Signal')

    // En artist_admin som aldri tildelte seg selv ville fått en tom liste.
    expect(releaseMocks.getReleases).toHaveBeenLastCalledWith(
      {},
      { artist_id: 'artist-1' },
      expect.any(AbortSignal),
    )
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
        {
          owner_id: 'label-1',
          owner_type: 'organization',
          status: 'published',
        },
        // React Query gir queryFn et AbortSignal, som sendes videre til fetch
        // så en forlatt navigering ikke lar forespørselen leve videre.
        expect.any(AbortSignal),
      ),
    )
  })

  it('scopes organization workspaces to organization-owned releases', async () => {
    renderReleases()

    await screen.findByText('Signal')

    expect(releaseMocks.getReleases).toHaveBeenLastCalledWith(
      {},
      { owner_id: 'label-1', owner_type: 'organization' },
      expect.any(AbortSignal),
    )
  })

  it('waits for workspace bootstrap before requesting releases', () => {
    renderReleases(user, null)

    expect(releaseMocks.getReleases).not.toHaveBeenCalled()
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
    expect(releaseMocks.getReleases).toHaveBeenLastCalledWith(
      {},
      { assigned_to_me: true, artist_id: 'artist-1' },
      expect.any(AbortSignal),
    )
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
