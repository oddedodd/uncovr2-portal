import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getArtistMembers,
  inviteArtistMember,
  removeArtistMember,
  updateArtistMember,
} from './artistTeam.ts'

afterEach(() => vi.restoreAllMocks())

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('artist team API', () => {
  it('lists artist members through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse([]))

    await getArtistMembers('artist-1')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/artists/artist-1/members'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('sends artist member invitations by email', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ id: 'invitation-1' }, 201))

    await inviteArtistMember('artist-1', {
      email: 'member@example.com',
      role: 'artist_user',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/artists/artist-1/invitations'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'member@example.com',
          role: 'artist_user',
        }),
      }),
    )
  })

  it('updates and removes artist memberships through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ id: 'membership-1' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Membership removed.' }))

    await updateArtistMember('artist-1', 'membership-1', {
      role: 'artist_admin',
    })
    await removeArtistMember('artist-1', 'membership-1')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL(
        'http://localhost:8000/api/v1/artists/artist-1/members/membership-1',
      ),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ role: 'artist_admin' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL(
        'http://localhost:8000/api/v1/artists/artist-1/members/membership-1',
      ),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
