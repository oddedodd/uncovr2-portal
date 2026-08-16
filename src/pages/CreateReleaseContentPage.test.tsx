import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { CurrentUser, Workspace } from '../lib/auth.ts'
import type { ReleasePermissions } from '../lib/releases.ts'
import { CreateReleaseContentPage } from './CreateReleaseContentPage.tsx'

const releaseMocks = vi.hoisted(() => ({
  createReleasePage: vi.fn(),
  getRelease: vi.fn(),
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
  pages: [
    { id: 'page-1', position: 1, title: 'Story', blocks: [] },
    { id: 'page-2', position: 2, title: 'Credits', blocks: [] },
  ],
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        element: <Outlet context={{ user, workspace }} />,
        children: [
          {
            path: '/releases/:releaseId/pages/new',
            element: <CreateReleaseContentPage />,
          },
          {
            path: '/releases/:releaseId/pages/:pageId',
            element: <h1>Sideredigering</h1>,
          },
        ],
      },
    ],
    { initialEntries: ['/releases/release-1/pages/new'] },
  )

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

beforeEach(() => {
  releaseMocks.createReleasePage.mockReset()
  releaseMocks.getRelease.mockReset()
  releaseMocks.getRelease.mockResolvedValue(release)
  releaseMocks.createReleasePage.mockResolvedValue({
    id: 'page-3',
    parent: { type: 'release', id: 'release-1' },
    position: 3,
    title: 'Notes',
  })
})

describe('CreateReleaseContentPage', () => {
  it('appends the page and opens its own route', async () => {
    const browserUser = userEvent.setup()

    renderPage()

    await browserUser.type(await screen.findByLabelText('Sidetittel'), 'Notes')
    await browserUser.click(
      screen.getByRole('button', { name: 'Opprett side' }),
    )

    expect(releaseMocks.createReleasePage).toHaveBeenCalledWith('release-1', {
      position: 3,
      title: 'Notes',
    })
    // Siden er tom rett etter opprettelsen, så brukeren skal rett til blokkene.
    expect(
      await screen.findByRole('heading', { name: 'Sideredigering' }),
    ).toBeVisible()
  })

  it('creates a page without a title', async () => {
    const browserUser = userEvent.setup()

    renderPage()

    await screen.findByLabelText('Sidetittel')
    await browserUser.click(
      screen.getByRole('button', { name: 'Opprett side' }),
    )

    expect(releaseMocks.createReleasePage).toHaveBeenCalledWith('release-1', {
      position: 3,
      title: null,
    })
  })

  it('hides the form when the release cannot be edited', async () => {
    releaseMocks.getRelease.mockResolvedValue({
      ...release,
      permissions: permissions(),
      status: 'published',
    })

    renderPage()

    expect(
      await screen.findByText('Utgivelsen er låst i denne statusen'),
    ).toBeVisible()
    expect(screen.queryByLabelText('Sidetittel')).not.toBeInTheDocument()
  })
})
