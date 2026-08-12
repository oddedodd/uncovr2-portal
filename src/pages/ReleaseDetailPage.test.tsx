import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import { ReleaseDetailPage } from './ReleaseDetailPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  addReleaseArtist: vi.fn(),
  createReleasePage: vi.fn(),
  createReleaseTrack: vi.fn(),
  createTrackPage: vi.fn(),
  deleteReleasePage: vi.fn(),
  deleteReleaseTrack: vi.fn(),
  getRelease: vi.fn(),
  removeReleaseArtist: vi.fn(),
  updateReleasePage: vi.fn(),
  updateRelease: vi.fn(),
  updateReleaseCover: vi.fn(),
  updateReleaseTrack: vi.fn(),
}))

const artistMocks = vi.hoisted(() => ({
  getArtists: vi.fn(),
}))

vi.mock('../lib/releases.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/releases.ts')>()
  return { ...original, ...releaseMocks }
})

vi.mock('../lib/artists.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/artists.ts')>()
  return { ...original, ...artistMocks }
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
  artistMocks.getArtists.mockReset()
  releaseMocks.getRelease.mockReset()
  releaseMocks.addReleaseArtist.mockReset()
  releaseMocks.createReleasePage.mockReset()
  releaseMocks.createReleaseTrack.mockReset()
  releaseMocks.createTrackPage.mockReset()
  releaseMocks.deleteReleasePage.mockReset()
  releaseMocks.deleteReleaseTrack.mockReset()
  releaseMocks.removeReleaseArtist.mockReset()
  releaseMocks.updateReleasePage.mockReset()
  releaseMocks.updateRelease.mockReset()
  releaseMocks.updateReleaseCover.mockReset()
  releaseMocks.updateReleaseTrack.mockReset()
  artistMocks.getArtists.mockResolvedValue({
    data: [
      {
        id: 'artist-2',
        status: 'active',
        profile: {
          name: 'Nova',
          biography: null,
          website_url: null,
          logo_media_id: null,
          logo_media: null,
          image_media_id: null,
          image_media: null,
        },
        created_at: '2026-08-09T10:00:00.000Z',
        updated_at: '2026-08-09T10:00:00.000Z',
      },
    ],
    pagination: {
      per_page: 25,
      next_cursor: null,
      previous_cursor: null,
      has_more: false,
    },
  })
  releaseMocks.getRelease.mockResolvedValue(release)
  releaseMocks.addReleaseArtist.mockResolvedValue({
    artist_id: 'artist-2',
    is_primary: false,
    position: 2,
  })
  releaseMocks.removeReleaseArtist.mockResolvedValue({ message: 'Removed' })
  releaseMocks.createReleaseTrack.mockResolvedValue({
    id: 'track-3',
    release_id: 'release-1',
    position: 3,
    title: 'New track',
    duration_ms: null,
    isrc: null,
    is_explicit: false,
  })
  releaseMocks.deleteReleaseTrack.mockResolvedValue({ message: 'Deleted' })
  releaseMocks.createReleasePage.mockResolvedValue({
    id: 'page-3',
    parent: { type: 'release', id: 'release-1' },
    position: 2,
    title: 'Credits',
  })
  releaseMocks.createTrackPage.mockResolvedValue({
    id: 'page-4',
    parent: { type: 'track', id: 'track-1' },
    position: 2,
    title: 'Lyrics',
  })
  releaseMocks.deleteReleasePage.mockResolvedValue({ message: 'Deleted' })
  releaseMocks.updateRelease.mockResolvedValue(release)
  releaseMocks.updateReleasePage.mockResolvedValue({
    id: 'page-1',
    parent: { type: 'release', id: 'release-1' },
    position: 1,
    title: 'Updated story',
  })
  releaseMocks.updateReleaseTrack.mockResolvedValue({
    id: 'track-1',
    release_id: 'release-1',
    position: 1,
    title: 'Updated track',
    duration_ms: null,
    isrc: null,
    is_explicit: false,
  })
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

  it('adds and removes release artists for assigned draft releases', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      artists: [
        ...release.artists,
        {
          artist_id: 'artist-3',
          name: 'Echo',
          is_primary: false,
          position: 2,
        },
      ],
      editor_user_ids: ['label-user-1'],
    })

    renderRelease()

    await screen.findByRole('heading', { name: 'Signal' })
    await screen.findByRole('option', { name: 'Nova' })
    await browserUser.selectOptions(
      screen.getByLabelText('Legg til artist'),
      'artist-2',
    )
    await browserUser.click(
      screen.getByRole('button', { name: 'Legg til artist' }),
    )
    await browserUser.click(screen.getByRole('button', { name: 'Fjern' }))

    expect(releaseMocks.addReleaseArtist).toHaveBeenCalledWith('release-1', {
      artist_id: 'artist-2',
      is_primary: false,
      position: 3,
    })
    expect(releaseMocks.removeReleaseArtist).toHaveBeenCalledWith(
      'release-1',
      'artist-3',
    )
  })

  it('creates, edits, sorts and removes tracks for assigned draft releases', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      editor_user_ids: ['label-user-1'],
      tracks: [
        {
          id: 'track-1',
          position: 1,
          title: 'Arrival',
          duration_ms: 183000,
          isrc: 'NOABC2600001',
          is_explicit: false,
        },
        {
          id: 'track-2',
          position: 2,
          title: 'Departure',
          duration_ms: null,
          isrc: null,
          is_explicit: true,
        },
      ],
    })

    renderRelease()

    await screen.findAllByText('Arrival')
    await browserUser.type(screen.getByLabelText('Nytt spor'), 'Return')
    await browserUser.click(
      screen.getByRole('button', { name: 'Legg til spor' }),
    )

    const trackTitles = screen.getAllByLabelText('Sportittel')
    await browserUser.clear(trackTitles[0])
    await browserUser.type(trackTitles[0], 'Arrival edit')
    await browserUser.click(
      screen.getAllByRole('button', { name: 'Lagre spor' })[0],
    )
    await browserUser.click(screen.getAllByRole('button', { name: 'Ned' })[0])
    await browserUser.click(screen.getAllByRole('button', { name: 'Fjern' })[0])

    await waitFor(() =>
      expect(releaseMocks.createReleaseTrack).toHaveBeenCalledWith(
        'release-1',
        {
          position: 3,
          title: 'Return',
          duration_ms: null,
          isrc: null,
          is_explicit: false,
        },
      ),
    )
    expect(releaseMocks.updateReleaseTrack).toHaveBeenCalledWith(
      'release-1',
      'track-1',
      {
        position: 1,
        title: 'Arrival edit',
        duration_ms: 183000,
        isrc: 'NOABC2600001',
        is_explicit: false,
      },
    )
    expect(releaseMocks.updateReleaseTrack).toHaveBeenCalledWith(
      'release-1',
      'track-1',
      { position: 3 },
    )
    expect(releaseMocks.updateReleaseTrack).toHaveBeenCalledWith(
      'release-1',
      'track-2',
      { position: 1 },
    )
    expect(releaseMocks.updateReleaseTrack).toHaveBeenCalledWith(
      'release-1',
      'track-1',
      { position: 2 },
    )
    expect(releaseMocks.deleteReleaseTrack).toHaveBeenCalledWith(
      'release-1',
      'track-1',
    )
  })

  it('creates, edits and removes release and track pages', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      editor_user_ids: ['label-user-1'],
      pages: [{ id: 'page-1', position: 1, title: 'Story' }],
      tracks: [
        {
          id: 'track-1',
          position: 1,
          title: 'Arrival',
          duration_ms: null,
          isrc: null,
          is_explicit: false,
          pages: [{ id: 'page-2', position: 1, title: 'Lyrics' }],
        },
      ],
    })

    renderRelease()

    await screen.findByText('Utgivelsessider')
    await browserUser.type(
      screen.getByLabelText('Ny utgivelsesside'),
      'Credits',
    )
    await browserUser.click(
      screen.getByRole('button', { name: 'Opprett side' }),
    )
    await browserUser.type(screen.getByLabelText('Ny sporside'), 'Notes')
    await browserUser.click(
      screen.getByRole('button', { name: 'Opprett sporside' }),
    )

    const pageTitles = screen.getAllByLabelText('Sidetittel')
    await browserUser.clear(pageTitles[0])
    await browserUser.type(pageTitles[0], 'Updated story')
    await browserUser.click(
      screen.getAllByRole('button', { name: 'Lagre side' })[0],
    )
    await browserUser.click(
      screen.getAllByRole('button', { name: 'Fjern side' })[0],
    )

    expect(releaseMocks.createReleasePage).toHaveBeenCalledWith('release-1', {
      position: 2,
      title: 'Credits',
    })
    expect(releaseMocks.createTrackPage).toHaveBeenCalledWith('track-1', {
      position: 2,
      title: 'Notes',
    })
    expect(releaseMocks.updateReleasePage).toHaveBeenCalledWith('page-1', {
      position: 1,
      title: 'Updated story',
    })
    expect(releaseMocks.deleteReleasePage).toHaveBeenCalledWith('page-1')
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
