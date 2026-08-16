import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import { ApiError } from '../lib/api.ts'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import type { ReleasePermissions } from '../lib/releases.ts'
import { EditReleaseContentPage } from './EditReleaseContentPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  createContentBlock: vi.fn(),
  deleteContentBlock: vi.fn(),
  getRelease: vi.fn(),
  reorderPageBlocks: vi.fn(),
  updateContentBlock: vi.fn(),
  updateReleasePage: vi.fn(),
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
  permissions: permissions({ can_update: true, can_submit: true }),
  created_at: '2026-08-09T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
  pages: [{ id: 'page-1', position: 1, title: 'Story', blocks: [] }],
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        element: <Outlet context={{ user, workspace }} />,
        children: [
          {
            path: '/releases/:releaseId/pages/:pageId',
            element: <EditReleaseContentPage />,
          },
        ],
      },
    ],
    { initialEntries: ['/releases/release-1/pages/page-1'] },
  )

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

beforeEach(() => {
  mediaMocks.uploadMedia.mockReset()
  releaseMocks.createContentBlock.mockReset()
  releaseMocks.deleteContentBlock.mockReset()
  releaseMocks.getRelease.mockReset()
  releaseMocks.reorderPageBlocks.mockReset()
  releaseMocks.updateContentBlock.mockReset()
  releaseMocks.updateReleasePage.mockReset()
  mediaMocks.uploadMedia.mockResolvedValue({
    id: 'media-1',
    status: 'ready',
    mime_type: 'image/png',
    width: 800,
    height: 800,
  })
  releaseMocks.getRelease.mockResolvedValue(release)
  releaseMocks.createContentBlock.mockResolvedValue({
    id: 'block-2',
    position: 2,
    type: 'text',
    version: 1,
    payload: { body: 'New body' },
  })
  releaseMocks.deleteContentBlock.mockResolvedValue({ message: 'Deleted' })
  releaseMocks.reorderPageBlocks.mockResolvedValue([
    {
      id: 'block-2',
      position: 1,
      type: 'quote',
      version: 1,
      payload: { text: 'Sitat', attribution: null },
    },
    {
      id: 'block-1',
      position: 2,
      type: 'text',
      version: 1,
      payload: { body: 'Original body' },
    },
  ])
  releaseMocks.updateContentBlock.mockResolvedValue({
    id: 'block-1',
    position: 1,
    type: 'text',
    version: 2,
    payload: { body: 'Updated body' },
  })
  releaseMocks.updateReleasePage.mockResolvedValue({
    id: 'page-1',
    parent: { type: 'release', id: 'release-1' },
    position: 1,
    title: 'Updated story',
  })
})

describe('EditReleaseContentPage', () => {
  it('saves the page title', async () => {
    const browserUser = userEvent.setup()

    renderPage()

    const title = await screen.findByLabelText('Sidetittel')
    await browserUser.clear(title)
    await browserUser.type(title, 'Updated story')
    await browserUser.click(screen.getByRole('button', { name: 'Lagre side' }))

    // Rekkefølgen styres fra utgivelsen, så posisjonen sendes ikke herfra.
    expect(releaseMocks.updateReleasePage).toHaveBeenCalledWith('page-1', {
      title: 'Updated story',
    })
  })

  it('creates, edits and removes page content blocks', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      pages: [
        {
          id: 'page-1',
          position: 1,
          title: 'Story',
          blocks: [
            {
              id: 'block-1',
              // Hull i posisjonene: sletting renummererer ikke server-side.
              position: 3,
              type: 'text',
              version: 1,
              payload: { body: 'Original body' },
            },
          ],
        },
      ],
    })

    renderPage()

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

    // Opprettelse forskyver ikke server-side, så forslaget bygger på den
    // høyeste posisjonen — ikke på antallet blokker.
    expect(releaseMocks.createContentBlock).toHaveBeenCalledWith('page-1', {
      position: 4,
      type: 'text',
      payload: { body: 'New body' },
    })
    // Posisjonen sendes aldri på en PATCH: den ville lagt igjen et
    // versjonssnapshot uten at innholdet er endret.
    expect(releaseMocks.updateContentBlock).toHaveBeenCalledWith(
      'page-1',
      'block-1',
      {
        type: 'text',
        payload: { body: 'Updated body' },
      },
    )
    expect(releaseMocks.deleteContentBlock).toHaveBeenCalledWith(
      'page-1',
      'block-1',
    )
  })

  it('reorders blocks by sending the whole order', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
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
            {
              id: 'block-2',
              position: 4,
              type: 'quote',
              version: 1,
              payload: { text: 'Sitat', attribution: null },
            },
          ],
        },
      ],
    })

    renderPage()

    expect(
      await screen.findByRole('button', { name: 'Flytt opp: blokk 1' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Flytt ned: blokk 2' }),
    ).toBeDisabled()
    await browserUser.click(
      screen.getByRole('button', { name: 'Flytt ned: blokk 1' }),
    )

    // Rekkefølgen sendes som en hel permutasjon. Posisjonene regnes aldri ut
    // her, og PATCH brukes ikke: den ville bumpet `version`.
    expect(releaseMocks.reorderPageBlocks).toHaveBeenCalledWith('page-1', [
      'block-2',
      'block-1',
    ])
    expect(releaseMocks.updateContentBlock).not.toHaveBeenCalled()
    expect(await screen.findByText('1. Sitat')).toBeVisible()
  })

  it('refetches the release when the block order is rejected as stale', async () => {
    const browserUser = userEvent.setup()
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
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
            {
              id: 'block-2',
              position: 2,
              type: 'quote',
              version: 1,
              payload: { text: 'Sitat', attribution: null },
            },
          ],
        },
      ],
    })
    releaseMocks.reorderPageBlocks.mockRejectedValue(
      new ApiError(
        422,
        'validation_failed',
        'The submitted data is invalid.',
        'request-4',
        {
          fields: {
            block_ids: [
              'The order must list every block on the page exactly once.',
            ],
          },
        },
      ),
    )

    renderPage()

    await browserUser.click(
      await screen.findByRole('button', { name: 'Flytt ned: blokk 1' }),
    )

    expect(
      await screen.findByText(
        'Blokkene ble endret et annet sted mens du jobbet. Siden er hentet på nytt — prøv flyttingen på nytt.',
      ),
    ).toBeVisible()
    expect(releaseMocks.getRelease).toHaveBeenCalledTimes(2)
  })

  it('uploads media for image content blocks', async () => {
    const browserUser = userEvent.setup()
    const file = new File(['image'], 'studio.png', { type: 'image/png' })

    renderPage()

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

  it('explains a page that is no longer part of the release', async () => {
    releaseMocks.getRelease.mockResolvedValue({ ...release, pages: [] })

    renderPage()

    expect(await screen.findByText('Fant ikke siden')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Tilbake til utgivelsen' }),
    ).toHaveAttribute('href', '/releases/release-1')
  })

  it('renders the page read-only without update permission', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: permissions(),
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

    renderPage()

    expect(await screen.findByText('Original body')).toBeVisible()
    expect(screen.queryByLabelText('Sidetittel')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Blokktype')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Du er ikke tildelt denne utgivelsen. Be en label-admin om tilgang.',
      ),
    ).toBeVisible()
  })
})
