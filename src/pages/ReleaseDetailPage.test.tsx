import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import { ReleaseDetailPage } from './ReleaseDetailPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  getRelease: vi.fn(),
  updateRelease: vi.fn(),
  updateReleaseCover: vi.fn(),
}))

vi.mock('../lib/releases.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/releases.ts')>()
  return { ...original, ...releaseMocks }
})

const user: CurrentUser = {
  id: 'label-user-1',
  email: 'label-user@example.com',
  email_verified_at: '2026-08-09T10:00:00.000Z',
  is_superadmin: false,
  profile: { display_name: 'Label User' },
}

const workspace: Workspace = {
  id: 'label-1',
  type: 'organization',
  name: 'North Label',
  role: 'label_user',
  status: 'active',
}

const artistUser: CurrentUser = {
  id: 'artist-user-1',
  email: 'artist-user@example.com',
  email_verified_at: '2026-08-09T10:00:00.000Z',
  is_superadmin: false,
  profile: { display_name: 'Artist User' },
}

const artistWorkspace: Workspace = {
  id: 'artist-1',
  type: 'artist',
  name: 'Lumen',
  role: 'artist_user',
  status: 'active',
}

const release = {
  id: 'release-1',
  owner: { type: 'organization' as const, id: 'label-1' },
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

const artistRelease = {
  ...release,
  owner: { type: 'artist' as const, id: 'artist-1' },
}

function renderRelease(
  contextUser: CurrentUser = user,
  contextWorkspace: Workspace = workspace,
) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <Outlet
            context={{ user: contextUser, workspace: contextWorkspace }}
          />
        ),
        children: [
          { path: '/releases/:releaseId', element: <ReleaseDetailPage /> },
        ],
      },
    ],
    { initialEntries: ['/releases/release-1'] },
  )

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

beforeEach(() => {
  releaseMocks.getRelease.mockReset()
  releaseMocks.updateRelease.mockReset()
  releaseMocks.updateReleaseCover.mockReset()
  releaseMocks.getRelease.mockResolvedValue(release)
  releaseMocks.updateRelease.mockResolvedValue(release)
})

describe('ReleaseDetailPage', () => {
  it('keeps Label User from editing unrestricted releases', async () => {
    renderRelease()

    expect(await screen.findByRole('heading', { name: 'Signal' })).toBeVisible()
    expect(screen.queryByText('Last opp bilde')).not.toBeInTheDocument()
    expect(releaseMocks.updateReleaseCover).not.toHaveBeenCalled()
  })

  it('lets Label User edit assigned draft releases', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      editor_user_ids: ['label-user-1'],
    })

    renderRelease()

    expect(await screen.findByRole('heading', { name: 'Signal' })).toBeVisible()
    expect(screen.getByText('Last opp bilde')).toBeVisible()
  })

  it('saves metadata for assigned draft releases', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      editor_user_ids: ['label-user-1'],
    })

    renderRelease()

    const title = await screen.findByLabelText('Tittel')
    await browserUser.clear(title)
    await browserUser.type(title, 'New Signal')
    await browserUser.click(
      screen.getByRole('button', { name: 'Lagre metadata' }),
    )

    expect(releaseMocks.updateRelease).toHaveBeenCalledWith('release-1', {
      type: 'single',
      title: 'New Signal',
      subtitle: null,
      description: null,
      release_date: null,
      upc: null,
    })
  })

  it('keeps Artist User from editing unassigned artist releases', async () => {
    releaseMocks.getRelease.mockResolvedValue(artistRelease)

    renderRelease(artistUser, artistWorkspace)

    expect(await screen.findByRole('heading', { name: 'Signal' })).toBeVisible()
    expect(screen.queryByText('Last opp bilde')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Lagre metadata' }),
    ).not.toBeInTheDocument()
  })

  it('lets Artist User edit assigned artist releases', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      editor_user_ids: ['artist-user-1'],
    })

    renderRelease(artistUser, artistWorkspace)

    const title = await screen.findByLabelText('Tittel')
    expect(screen.getByText('Last opp bilde')).toBeVisible()
    await browserUser.clear(title)
    await browserUser.type(title, 'Artist Signal')
    await browserUser.click(
      screen.getByRole('button', { name: 'Lagre metadata' }),
    )

    expect(releaseMocks.updateRelease).toHaveBeenCalledWith('release-1', {
      type: 'single',
      title: 'Artist Signal',
      subtitle: null,
      description: null,
      release_date: null,
      upc: null,
    })
  })
})
