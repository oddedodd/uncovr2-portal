import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import { CreateReleasePage } from './CreateReleasePage.tsx'

const releaseMocks = vi.hoisted(() => ({
  createRelease: vi.fn(),
}))

vi.mock('../lib/releases.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/releases.ts')>()
  return { ...original, ...releaseMocks }
})

const user: CurrentUser = {
  id: 'artist-admin-1',
  email: 'artist-admin@example.com',
  email_verified_at: '2026-08-09T10:00:00.000Z',
  is_superadmin: false,
  profile: { display_name: 'Artist Admin' },
}

const artistWorkspace: Workspace = {
  id: 'artist-1',
  type: 'artist',
  name: 'Lumen',
  role: 'artist_admin',
  status: 'active',
}

function renderCreateRelease(workspace: Workspace) {
  const router = createMemoryRouter([
    {
      element: <Outlet context={{ user, workspace }} />,
      children: [{ path: '/', element: <CreateReleasePage /> }],
    },
    { path: '/releases/:releaseId', element: <p>Release detail</p> },
  ])

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

beforeEach(() => {
  releaseMocks.createRelease.mockReset()
  releaseMocks.createRelease.mockResolvedValue({
    id: 'release-1',
    owner: { type: 'artist', id: 'artist-1' },
    type: 'single',
    status: 'draft',
    title: 'Signal',
    subtitle: null,
    description: null,
    release_date: null,
    upc: null,
    cover_media_id: null,
    cover_media: null,
    artists: [],
    editor_user_ids: ['artist-admin-1'],
    created_at: '2026-08-09T10:00:00.000Z',
    updated_at: '2026-08-09T10:00:00.000Z',
  })
})

describe('CreateReleasePage', () => {
  it('creates an artist-owned release from the active artist workspace', async () => {
    const browserUser = userEvent.setup()
    renderCreateRelease(artistWorkspace)

    await browserUser.type(screen.getByLabelText('Tittel'), 'Signal')
    await browserUser.click(
      screen.getByRole('button', { name: 'Opprett utgivelse' }),
    )

    await waitFor(() =>
      expect(releaseMocks.createRelease).toHaveBeenCalledWith({
        owner_type: 'artist',
        owner_id: 'artist-1',
        primary_artist_id: 'artist-1',
        type: 'single',
        title: 'Signal',
        subtitle: null,
        description: null,
        release_date: null,
        upc: null,
        cover_media_id: null,
      }),
    )
  })

  it('blocks artist users from the creation form', () => {
    renderCreateRelease({ ...artistWorkspace, role: 'artist_user' })

    expect(
      screen.getByRole('heading', {
        name: 'Dette arbeidsområdet er ikke tilgjengelig.',
      }),
    ).toBeVisible()
  })
})
