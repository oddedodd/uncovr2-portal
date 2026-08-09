import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import { OrganizationDetailPage } from './OrganizationDetailPage.tsx'

const organizationMocks = vi.hoisted(() => ({
  getOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  updateOrganizationStatus: vi.fn(),
}))

vi.mock('../lib/organizations.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../lib/organizations.ts')>()
  return { ...original, ...organizationMocks }
})

const organization = {
  id: 'label-1',
  status: 'active' as const,
  profile: {
    name: 'North Label',
    legal_name: 'North Label AS',
    description: null,
    website_url: null,
    logo_media_id: null,
    logo_media: null,
  },
  created_at: '2026-08-09T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
}

beforeEach(() => {
  organizationMocks.getOrganization.mockReset()
  organizationMocks.updateOrganization.mockReset()
  organizationMocks.updateOrganizationStatus.mockReset()
  organizationMocks.getOrganization.mockResolvedValue(organization)
  organizationMocks.updateOrganizationStatus.mockResolvedValue({
    ...organization,
    status: 'suspended',
  })
})

describe('OrganizationDetailPage', () => {
  it('requires confirmation before suspending a label', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/labels/:organizationId',
          element: <OrganizationDetailPage />,
        },
      ],
      { initialEntries: ['/labels/label-1'] },
    )
    const user = userEvent.setup()

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    await user.click(
      await screen.findByRole('button', { name: 'Suspender label' }),
    )
    expect(organizationMocks.updateOrganizationStatus).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: 'Bekreft suspendering' }),
    )
    expect(organizationMocks.updateOrganizationStatus).toHaveBeenCalledWith(
      'label-1',
      'suspended',
    )
  })
})
