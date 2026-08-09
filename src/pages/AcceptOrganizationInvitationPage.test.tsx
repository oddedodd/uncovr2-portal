import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../app/AppProviders.tsx'
import { AcceptOrganizationInvitationPage } from './AcceptOrganizationInvitationPage.tsx'

const invitationMocks = vi.hoisted(() => ({
  acceptOrganizationInvitation: vi.fn(),
}))

vi.mock('../lib/organizations.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../lib/organizations.ts')>()
  return { ...original, ...invitationMocks }
})

beforeEach(() => {
  invitationMocks.acceptOrganizationInvitation.mockReset()
  invitationMocks.acceptOrganizationInvitation.mockResolvedValue({
    membership_id: 'membership-1',
    organization_id: 'label-1',
    role: 'label_admin',
  })
})

describe('AcceptOrganizationInvitationPage', () => {
  it('lets the signed-in recipient explicitly accept the token', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/invitations/accept',
          element: <AcceptOrganizationInvitationPage />,
        },
      ],
      { initialEntries: ['/invitations/accept?token=invite-token'] },
    )
    const user = userEvent.setup()

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    await user.click(screen.getByRole('button', { name: 'Godta invitasjonen' }))

    expect(invitationMocks.acceptOrganizationInvitation).toHaveBeenCalledWith(
      'invite-token',
    )
    expect(await screen.findByText('Invitasjonen er godtatt')).toBeVisible()
  })

  it('rejects an incomplete invitation link before calling the API', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/invitations/accept',
          element: <AcceptOrganizationInvitationPage />,
        },
      ],
      { initialEntries: ['/invitations/accept'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(screen.getByText('Invitasjonslenken mangler token')).toBeVisible()
    expect(invitationMocks.acceptOrganizationInvitation).not.toHaveBeenCalled()
  })
})
