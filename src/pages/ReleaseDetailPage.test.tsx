import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import { createQueryClient } from '../app/queryClient.ts'
import { ApiError } from '../lib/api.ts'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import { releaseKeys, type ReleasePermissions } from '../lib/releases.ts'
import { ReleaseDetailPage } from './ReleaseDetailPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  addReleaseArtist: vi.fn(),
  assignReleaseEditor: vi.fn(),
  deleteReleasePage: vi.fn(),
  getRelease: vi.fn(),
  removeReleaseArtist: vi.fn(),
  removeReleaseEditor: vi.fn(),
  submitRelease: vi.fn(),
  reorderReleasePages: vi.fn(),
  updateRelease: vi.fn(),
  updateReleaseCover: vi.fn(),
}))

const artistMocks = vi.hoisted(() => ({
  getArtists: vi.fn(),
}))

const teamMocks = vi.hoisted(() => ({
  getArtistMembers: vi.fn(),
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

vi.mock('../lib/artistTeam.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/artistTeam.ts')>()
  return { ...original, ...teamMocks }
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

function permissions(overrides: Partial<ReleasePermissions> = {}) {
  return {
    can_update: false,
    can_submit: false,
    can_delete: false,
    can_approve: false,
    can_publish: false,
    can_manage_editors: false,
    ...overrides,
  }
}

const editorPermissions = permissions({ can_update: true, can_submit: true })

const managerPermissions = permissions({
  can_update: true,
  can_submit: true,
  can_delete: true,
  can_approve: true,
  can_publish: true,
  can_manage_editors: true,
})

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
  editors: [],
  editor_user_ids: [],
  permissions: permissions(),
  created_at: '2026-08-09T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
}

const assignedRelease = { ...release, permissions: editorPermissions }

const artistRelease = {
  ...release,
  owner: { type: 'artist' as const, id: 'artist-1' },
}

function renderRelease(
  contextUser: CurrentUser = user,
  contextWorkspace: Workspace = workspace,
  client?: ReturnType<typeof createQueryClient>,
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
    <AppProviders client={client}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

beforeEach(() => {
  artistMocks.getArtists.mockReset()
  mediaMocks.uploadMedia.mockReset()
  teamMocks.getArtistMembers.mockReset()
  releaseMocks.getRelease.mockReset()
  releaseMocks.assignReleaseEditor.mockReset()
  releaseMocks.removeReleaseEditor.mockReset()
  releaseMocks.submitRelease.mockReset()
  releaseMocks.addReleaseArtist.mockReset()
  releaseMocks.deleteReleasePage.mockReset()
  releaseMocks.removeReleaseArtist.mockReset()
  releaseMocks.reorderReleasePages.mockReset()
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
  teamMocks.getArtistMembers.mockResolvedValue([
    {
      id: 'membership-1',
      artist_id: 'artist-1',
      user: {
        id: 'artist-user-1',
        email: 'artist-user@example.com',
        display_name: 'Artist User',
      },
      role: 'artist_user',
      status: 'active',
    },
    {
      id: 'membership-2',
      artist_id: 'artist-1',
      user: {
        id: 'suspended-user-1',
        email: 'suspended@example.com',
        display_name: 'Suspended User',
      },
      role: 'artist_user',
      status: 'suspended',
    },
  ])
  releaseMocks.assignReleaseEditor.mockResolvedValue({
    user_id: 'artist-user-1',
  })
  releaseMocks.removeReleaseEditor.mockResolvedValue({ message: 'Removed' })
  releaseMocks.submitRelease.mockResolvedValue({
    approval_request_id: 'approval-1',
    status: 'review',
  })
  releaseMocks.getRelease.mockResolvedValue(release)
  releaseMocks.addReleaseArtist.mockResolvedValue({
    artist_id: 'artist-2',
    is_primary: false,
    position: 2,
  })
  releaseMocks.removeReleaseArtist.mockResolvedValue({ message: 'Removed' })
  releaseMocks.deleteReleasePage.mockResolvedValue({ message: 'Deleted' })
  releaseMocks.updateRelease.mockResolvedValue(release)
  releaseMocks.reorderReleasePages.mockResolvedValue([
    { id: 'page-3', position: 1, title: 'Credits', blocks: [] },
    { id: 'page-1', position: 2, title: 'Story', blocks: [] },
  ])
})

describe('ReleaseDetailPage', () => {
  it('paints the header from the list cache before the detail response lands', async () => {
    const client = createQueryClient()
    client.setQueryData(releaseKeys.list(), {
      data: [release],
      pagination: {
        per_page: 25,
        next_cursor: null,
        previous_cursor: null,
        has_more: false,
      },
    })
    let landDetail: (value: unknown) => void = () => undefined
    releaseMocks.getRelease.mockReturnValue(
      new Promise((resolve) => {
        landDetail = resolve
      }),
    )

    renderRelease(user, workspace, client)

    // Tittelen kommer fra sammendraget i lista, uten å vente på detaljkallet.
    expect(screen.getByRole('heading', { name: 'Signal' })).toBeVisible()
    // De redigerbare seksjonene har ukontrollerte felt, så de holdes tilbake
    // til ekte data er på plass.
    expect(screen.queryByLabelText('Tittel')).not.toBeInTheDocument()

    landDetail(assignedRelease)

    expect(await screen.findByLabelText('Tittel')).toBeVisible()
  })

  it('keeps Label User from editing unrestricted releases', async () => {
    renderRelease()

    expect(await screen.findByRole('heading', { name: 'Signal' })).toBeVisible()
    expect(screen.queryByText('Last opp bilde')).not.toBeInTheDocument()
    expect(releaseMocks.updateReleaseCover).not.toHaveBeenCalled()
  })

  it('lets Label User edit assigned draft releases', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: editorPermissions,
    })

    renderRelease()

    expect(await screen.findByRole('heading', { name: 'Signal' })).toBeVisible()
    expect(screen.getByText('Last opp bilde')).toBeVisible()
  })

  it('saves metadata for assigned draft releases', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: editorPermissions,
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
      permissions: editorPermissions,
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

  it('links each page to its own route', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: editorPermissions,
      pages: [{ id: 'page-1', position: 1, title: 'Story', blocks: [] }],
    })

    renderRelease()

    expect(
      await screen.findByRole('link', { name: 'Rediger side: Story' }),
    ).toHaveAttribute('href', '/releases/release-1/pages/page-1')
    expect(screen.getByRole('link', { name: 'Ny side' })).toHaveAttribute(
      'href',
      '/releases/release-1/pages/new',
    )
    // Selve innholdet redigeres på sideruten, ikke her.
    expect(screen.queryByLabelText('Sidetittel')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Blokktype')).not.toBeInTheDocument()
  })

  it('reorders pages by sending the whole order', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: editorPermissions,
      pages: [
        { id: 'page-1', position: 1, title: 'Story', blocks: [] },
        // Hull i posisjonene: sletting renummererer ikke server-side.
        { id: 'page-3', position: 4, title: 'Credits', blocks: [] },
      ],
    })

    renderRelease()

    expect(
      await screen.findByRole('button', { name: 'Flytt opp: Story' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Flytt ned: Credits' }),
    ).toBeDisabled()
    await browserUser.click(
      screen.getByRole('button', { name: 'Flytt ned: Story' }),
    )

    // Laravel krever en eksakt permutasjon og renummererer selv, så posisjonene
    // regnes aldri ut her.
    expect(releaseMocks.reorderReleasePages).toHaveBeenCalledWith('release-1', [
      'page-3',
      'page-1',
    ])
    expect(await screen.findByText('1. Credits')).toBeVisible()
  })

  it('refetches the release when the order is rejected as stale', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: editorPermissions,
      pages: [
        { id: 'page-1', position: 1, title: 'Story', blocks: [] },
        { id: 'page-2', position: 2, title: 'Credits', blocks: [] },
      ],
    })
    releaseMocks.reorderReleasePages.mockRejectedValue(
      new ApiError(
        422,
        'validation_failed',
        'The submitted data is invalid.',
        'request-3',
        {
          fields: {
            page_ids: [
              'The order must list every page in the release exactly once.',
            ],
          },
        },
      ),
    )

    renderRelease()

    await browserUser.click(
      await screen.findByRole('button', { name: 'Flytt ned: Story' }),
    )

    // En avvist rekkefølge betyr at lista vår er utdatert, ikke at brukeren
    // gjorde noe feil.
    expect(
      await screen.findByText(
        'Sidene ble endret et annet sted mens du jobbet. Lista er hentet på nytt — prøv flyttingen på nytt.',
      ),
    ).toBeVisible()
    expect(releaseMocks.getRelease).toHaveBeenCalledTimes(2)
  })

  it('removes a page only after the deletion is confirmed', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: editorPermissions,
      pages: [{ id: 'page-1', position: 1, title: 'Story', blocks: [] }],
    })

    renderRelease()

    await browserUser.click(
      await screen.findByRole('button', { name: 'Fjern side: Story' }),
    )

    expect(
      screen.getByText(
        'Siden og alle blokkene på den slettes permanent. Dette kan ikke angres.',
      ),
    ).toBeVisible()
    expect(releaseMocks.deleteReleasePage).not.toHaveBeenCalled()

    await browserUser.click(
      screen.getByRole('button', { name: 'Bekreft sletting' }),
    )

    expect(releaseMocks.deleteReleasePage).toHaveBeenCalledWith('page-1')
  })

  it('keeps page management out of a read-only release', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      pages: [{ id: 'page-1', position: 1, title: 'Story', blocks: [] }],
    })

    renderRelease()

    expect(
      await screen.findByRole('link', { name: 'Åpne side: Story' }),
    ).toHaveAttribute('href', '/releases/release-1/pages/page-1')
    expect(
      screen.queryByRole('button', { name: 'Flytt ned: Story' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Fjern side: Story' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Ny side' }),
    ).not.toBeInTheDocument()
  })

  it('keeps Artist User from editing unassigned artist releases', async () => {
    releaseMocks.getRelease.mockResolvedValue(artistRelease)

    renderRelease(artistUser, artistWorkspace)

    expect(await screen.findByRole('heading', { name: 'Signal' })).toBeVisible()
    expect(screen.queryByText('Last opp bilde')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Lagre metadata' }),
    ).not.toBeInTheDocument()
    // Utgivelsen skjules ikke: den vises skrivebeskyttet med en forklaring,
    // så brukeren slipper å oppdage manglende tilgang ved første lagring.
    expect(screen.getByText('Utgivelsesinformasjon')).toBeVisible()
    expect(
      screen.getByText(
        'Du er ikke tildelt denne utgivelsen. Be en artist-admin om tilgang.',
      ),
    ).toBeVisible()
  })

  it('separates a locked status from a missing assignment', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      status: 'published',
    })

    renderRelease(artistUser, artistWorkspace)

    expect(await screen.findByRole('heading', { name: 'Signal' })).toBeVisible()
    expect(
      screen.getByText('Utgivelsen er låst i denne statusen'),
    ).toBeVisible()
    expect(
      screen.queryByText(
        'Du er ikke tildelt denne utgivelsen. Be en artist-admin om tilgang.',
      ),
    ).not.toBeInTheDocument()
  })

  it('hides the assignment panel without manage-editor permission', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      permissions: editorPermissions,
    })

    renderRelease(artistUser, artistWorkspace)

    await screen.findByRole('heading', { name: 'Signal' })
    expect(screen.queryByLabelText('Tildel til')).not.toBeInTheDocument()
    expect(teamMocks.getArtistMembers).not.toHaveBeenCalled()
  })

  it('assigns and removes editors on the release', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      permissions: managerPermissions,
      editors: [{ user_id: 'artist-editor-1', display_name: 'Nora Voss' }],
    })

    renderRelease(artistUser, {
      ...artistWorkspace,
      role: 'artist_admin',
    })

    await screen.findByRole('heading', { name: 'Signal' })
    expect(screen.getByText('Nora Voss')).toBeVisible()

    // Kandidatene er artistens aktive medlemmer, og verdien er brukerens ULID
    // — ikke medlemskapets id.
    await screen.findByRole('option', {
      name: 'Artist User (artist-user@example.com)',
    })
    expect(
      screen.queryByRole('option', { name: /Suspended User/ }),
    ).not.toBeInTheDocument()

    await browserUser.selectOptions(
      screen.getByLabelText('Tildel til'),
      'artist-user-1',
    )
    await browserUser.click(
      screen.getByRole('button', { name: 'Tildel utgivelsen' }),
    )
    await browserUser.click(
      screen.getByRole('button', { name: 'Fjern tildeling' }),
    )

    expect(releaseMocks.assignReleaseEditor).toHaveBeenCalledWith(
      'release-1',
      'artist-user-1',
    )
    expect(releaseMocks.removeReleaseEditor).toHaveBeenCalledWith(
      'release-1',
      'artist-editor-1',
    )
  })

  it('shows the scope error from a rejected assignment', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      permissions: managerPermissions,
    })
    releaseMocks.assignReleaseEditor.mockRejectedValue(
      new ApiError(
        422,
        'validation_failed',
        'The submitted data is invalid.',
        'request-1',
        {
          fields: {
            user_id: [
              'The user must have active access to the release owner scope.',
            ],
          },
        },
      ),
    )

    renderRelease(artistUser, { ...artistWorkspace, role: 'artist_admin' })

    await screen.findByRole('option', {
      name: 'Artist User (artist-user@example.com)',
    })
    await browserUser.selectOptions(
      screen.getByLabelText('Tildel til'),
      'artist-user-1',
    )
    await browserUser.click(
      screen.getByRole('button', { name: 'Tildel utgivelsen' }),
    )

    expect(
      await screen.findByText(
        'The user must have active access to the release owner scope.',
      ),
    ).toBeVisible()
  })

  it('offers only the lifecycle actions the permissions allow', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      permissions: editorPermissions,
    })

    renderRelease(artistUser, artistWorkspace)

    await screen.findByRole('heading', { name: 'Signal' })
    expect(
      screen.queryByRole('button', { name: 'Slett utgivelse' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Arkiver' }),
    ).not.toBeInTheDocument()

    await browserUser.click(
      screen.getByRole('button', { name: 'Send til godkjenning' }),
    )

    expect(releaseMocks.submitRelease).toHaveBeenCalledWith('release-1')
  })

  it('explains a rejected transition with the field messages from Laravel', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      permissions: editorPermissions,
    })
    releaseMocks.submitRelease.mockRejectedValue(
      new ApiError(
        422,
        'validation_failed',
        'The submitted data is invalid.',
        'request-2',
        { fields: { release: ['A verified cover image is required.'] } },
      ),
    )

    renderRelease(artistUser, artistWorkspace)

    await screen.findByRole('heading', { name: 'Signal' })
    await browserUser.click(
      screen.getByRole('button', { name: 'Send til godkjenning' }),
    )

    // `can_submit` betyr at brukeren har lov, ikke at utgivelsen er komplett.
    expect(
      await screen.findByText('A verified cover image is required.'),
    ).toBeVisible()
  })

  it('lets Artist User edit assigned artist releases', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...artistRelease,
      permissions: editorPermissions,
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
