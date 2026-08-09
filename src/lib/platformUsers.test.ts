import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  correctMembershipRole,
  getPlatformUser,
  updatePlatformUserStatus,
} from './platformUsers.ts'

afterEach(() => vi.restoreAllMocks())

describe('getPlatformUser', () => {
  it('loads the protected user hierarchy endpoint', async () => {
    const detail = {
      id: 'user-1',
      email: 'ada@example.com',
      memberships: { organizations: [], artists: [] },
      release_editor_assignments: [],
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: detail }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(getPlatformUser('user-1')).resolves.toEqual(detail)
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/users/user-1'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})

describe('audited user administration', () => {
  it('sends confirmation and reason when changing account status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'user-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await updatePlatformUserStatus('user-1', {
      value: 'suspended',
      reason: 'Confirmed administrative suspension.',
      confirmation: 'user-1',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/users/user-1/status'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          status: 'suspended',
          reason: 'Confirmed administrative suspension.',
          confirmation: 'user-1',
        }),
      }),
    )
  })

  it('uses the scoped membership correction endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'membership-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await correctMembershipRole('user-1', 'membership-1', 'organization', {
      value: 'label_admin',
      reason: 'Correcting imported membership role.',
      confirmation: 'user-1',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8000/api/v1/users/user-1/organization-memberships/membership-1/role',
      ),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          role: 'label_admin',
          reason: 'Correcting imported membership role.',
          confirmation: 'user-1',
        }),
      }),
    )
  })
})
