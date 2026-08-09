import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  acceptOrganizationInvitation,
  createOrganization,
  inviteOrganizationAdministrator,
  updateOrganization,
  updateOrganizationStatus,
} from './organizations.ts'

const organization = {
  id: 'label-1',
  status: 'active' as const,
  profile: {
    name: 'North Label',
    legal_name: 'North Label AS',
    description: null,
    website_url: null,
  },
  created_at: '2026-08-09T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
}

const input = {
  name: 'North Label',
  legal_name: 'North Label AS',
  description: null,
  website_url: null,
}

afterEach(() => vi.restoreAllMocks())

function mockOrganizationResponse() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ data: organization }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
}

describe('organization administration API', () => {
  it('creates and corrects organizations through Laravel', async () => {
    const fetchMock = mockOrganizationResponse()

    await createOrganization(input)
    await updateOrganization('label-1', input)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL('http://localhost:8000/api/v1/organizations'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
        credentials: 'include',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL('http://localhost:8000/api/v1/organizations/label-1'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(input) }),
    )
  })

  it('uses the audited status endpoint for suspension', async () => {
    const fetchMock = mockOrganizationResponse()

    await updateOrganizationStatus('label-1', 'suspended')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/organizations/label-1/status'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' }),
      }),
    )
  })
})

describe('organization administrator invitation API', () => {
  it('invites a label admin and accepts the invitation through Laravel', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { id: 'invitation-1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await inviteOrganizationAdministrator('label-1', 'admin@example.com')
    await acceptOrganizationInvitation('plain-token')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL('http://localhost:8000/api/v1/organizations/label-1/invitations'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          role: 'label_admin',
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL('http://localhost:8000/api/v1/organization-invitations/accept'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'plain-token' }),
      }),
    )
  })
})
