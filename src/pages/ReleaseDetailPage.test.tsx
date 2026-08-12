import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import { ReleaseDetailPage } from './ReleaseDetailPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  addReleaseArtist: vi.fn(),
  createContentBlock: vi.fn(),
  createReleasePage: vi.fn(),
  deleteContentBlock: vi.fn(),
  deleteReleasePage: vi.fn(),
  getRelease: vi.fn(),
  removeReleaseArtist: vi.fn(),
  updateContentBlock: vi.fn(),
  updateReleasePage: vi.fn(),
  updateRelease: vi.fn(),
  updateReleaseCover: vi.fn(),
}))

const artistMocks = vi.hoisted(() => ({
  getArtists: vi.fn(),
}))

const mediaMocks = vi.hoisted(() => ({
  uploadMedia: vi.fn(),
}))

// Mockes på hook-nivå: mediaDownloadQueryOptions kaller getMediaDownload
// internt i modulen, så en mock av eksporten ville ikke fanget den opp.
vi.mock('../features/media/useMediaUrl.ts', () => ({
  useMediaUrl: () => ({ url: undefined, isPending: false, error: null }),
  useMediaUrls: () => ({ urls: new Map<string, string>(), isPending: false }),
}))

vi.mock('../lib/releases.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/releases.ts')>()
  return { ...original, ...releaseMocks }
})

vi.mock('../lib/media.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/media.ts')>()
  return { ...original, ...mediaMocks }
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
  mediaMocks.uploadMedia.mockReset()
  releaseMocks.getRelease.mockReset()
  releaseMocks.addReleaseArtist.mockReset()
  releaseMocks.createContentBlock.mockReset()
  releaseMocks.createReleasePage.mockReset()
  releaseMocks.deleteContentBlock.mockReset()
  releaseMocks.deleteReleasePage.mockReset()
  releaseMocks.removeReleaseArtist.mockReset()
  releaseMocks.updateContentBlock.mockReset()
  releaseMocks.updateReleasePage.mockReset()
  releaseMocks.updateRelease.mockReset()
  releaseMocks.updateReleaseCover.mockReset()
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
  mediaMocks.uploadMedia.mockResolvedValue({
    id: 'media-1',
    status: 'ready',
    mime_type: 'image/png',
    width: 800,
    height: 800,
  })
  releaseMocks.getRelease.mockResolvedValue(release)
  releaseMocks.addReleaseArtist.mockResolvedValue({
    artist_id: 'artist-2',
    is_primary: false,
    position: 2,
  })
  releaseMocks.removeReleaseArtist.mockResolvedValue({ message: 'Removed' })
  releaseMocks.createContentBlock.mockResolvedValue({
    id: 'block-2',
    position: 2,
    type: 'text',
    version: 1,
    payload: { body: 'New body' },
  })
  releaseMocks.createReleasePage.mockResolvedValue({
    id: 'page-3',
    parent: { type: 'release', id: 'release-1' },
    position: 2,
    title: 'Credits',
  })
  releaseMocks.deleteContentBlock.mockResolvedValue({ message: 'Deleted' })
  releaseMocks.deleteReleasePage.mockResolvedValue({ message: 'Deleted' })
  releaseMocks.updateContentBlock.mockResolvedValue({
    id: 'block-1',
    position: 1,
    type: 'text',
    version: 2,
    payload: { body: 'Updated body' },
  })
  releaseMocks.updateRelease.mockResolvedValue(release)
  releaseMocks.updateReleasePage.mockResolvedValue({
    id: 'page-1',
    parent: { type: 'release', id: 'release-1' },
    position: 1,
    title: 'Updated story',
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

  it('creates, edits and removes release pages', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      editor_user_ids: ['label-user-1'],
      pages: [{ id: 'page-1', position: 1, title: 'Story' }],
    })

    renderRelease()

    await screen.findByDisplayValue('Story')
    await browserUser.type(screen.getByLabelText('Ny side'), 'Credits')
    await browserUser.click(
      screen.getByRole('button', { name: 'Opprett side' }),
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
    expect(releaseMocks.updateReleasePage).toHaveBeenCalledWith('page-1', {
      position: 1,
      title: 'Updated story',
    })
    expect(releaseMocks.deleteReleasePage).toHaveBeenCalledWith('page-1')
  })

  it('creates, edits and removes page content blocks', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      editor_user_ids: ['label-user-1'],
      pages: [
        {
          id: 'page-1',
          position: 1,
          title: 'Story',
          blocks: [
            {
              id: 'block-1',
              position: 1,
              type: 'text',
              version: 1,
              payload: { body: 'Original body' },
            },
          ],
        },
      ],
    })

    renderRelease()

    await screen.findByDisplayValue('Original body')
    const initialTextAreas = screen.getAllByLabelText('Tekst')
    await browserUser.type(initialTextAreas[1], 'New body')
    await browserUser.click(
      screen.getByRole('button', { name: 'Legg til blokk' }),
    )

    const textAreas = screen.getAllByLabelText('Tekst')
    await browserUser.clear(textAreas[0])
    await browserUser.type(textAreas[0], 'Updated body')
    await browserUser.click(screen.getByRole('button', { name: 'Lagre blokk' }))
    await browserUser.click(screen.getByRole('button', { name: 'Fjern blokk' }))

    expect(releaseMocks.createContentBlock).toHaveBeenCalledWith('page-1', {
      position: 2,
      type: 'text',
      payload: { body: 'New body' },
    })
    expect(releaseMocks.updateContentBlock).toHaveBeenCalledWith(
      'page-1',
      'block-1',
      {
        position: 1,
        type: 'text',
        payload: { body: 'Updated body' },
      },
    )
    expect(releaseMocks.deleteContentBlock).toHaveBeenCalledWith(
      'page-1',
      'block-1',
    )
  })

  it('uploads media for image content blocks', async () => {
    const browserUser = userEvent.setup()
    const file = new File(['image'], 'studio.png', { type: 'image/png' })
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      editor_user_ids: ['label-user-1'],
      pages: [{ id: 'page-1', position: 1, title: 'Story', blocks: [] }],
    })

    renderRelease()

    await screen.findByText('Ingen blokker ennå.')
    await browserUser.selectOptions(screen.getByLabelText('Blokktype'), 'image')
    await browserUser.upload(screen.getByLabelText('Last opp media'), file)
    await screen.findByText(
      'Media er lastet opp. Lagre blokken for å bruke den.',
    )
    await browserUser.type(screen.getByLabelText('Alternativ tekst'), 'Studio')
    await browserUser.click(
      screen.getByRole('button', { name: 'Legg til blokk' }),
    )

    await waitFor(() =>
      expect(mediaMocks.uploadMedia).toHaveBeenCalledWith(
        'organization',
        'label-1',
        'image',
        file,
      ),
    )
    expect(releaseMocks.createContentBlock).toHaveBeenCalledWith('page-1', {
      position: 1,
      type: 'image',
      payload: {
        media_id: 'media-1',
        alt_text: 'Studio',
        caption: null,
      },
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
