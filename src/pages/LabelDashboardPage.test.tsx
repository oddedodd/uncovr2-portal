import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import type { Workspace } from '../lib/auth.ts'
import { LabelDashboardPage } from './LabelDashboardPage.tsx'

const organizationMocks = vi.hoisted(() => ({
  getOrganization: vi.fn(),
  updateOrganization: vi.fn(),
}))

vi.mock('../lib/organizations.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../lib/organizations.ts')>()
  return { ...original, ...organizationMocks }
})

const organization = {
  id: 'label-1',
  status: 'active',
  profile: {
    name: 'North Label',
    legal_name: 'North Label AS',
    description: null,
    website_url: null,
  },
  created_at: '2026-08-09T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
}

const workspace: Workspace = {
  id: 'label-1',
  type: 'organization',
  name: 'North Label',
  role: 'label_admin',
  status: 'active',
}

beforeEach(() => {
  organizationMocks.getOrganization.mockReset()
  organizationMocks.updateOrganization.mockReset()
  organizationMocks.getOrganization.mockResolvedValue(organization)
  organizationMocks.updateOrganization.mockResolvedValue(organization)
})

function renderDashboard(candidate: Workspace) {
  const router = createMemoryRouter([
    { path: '/', element: <LabelDashboardPage workspace={candidate} /> },
  ])
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('LabelDashboardPage', () => {
  it('lets Label Admin update the label profile', async () => {
    renderDashboard(workspace)
    const user = userEvent.setup()

    const name = await screen.findByRole('textbox', { name: 'Labelnavn' })
    await user.clear(name)
    await user.type(name, 'Updated Label')
    await user.click(screen.getByRole('button', { name: 'Lagre labelprofil' }))

    expect(organizationMocks.updateOrganization).toHaveBeenCalledWith(
      'label-1',
      expect.objectContaining({ name: 'Updated Label' }),
    )
  })

  it('shows Label User a read-only profile', async () => {
    renderDashboard({ ...workspace, role: 'label_user' })

    expect(await screen.findByText('North Label AS')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Lagre labelprofil' }),
    ).not.toBeInTheDocument()
  })
})
