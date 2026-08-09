import { afterEach, describe, expect, it, vi } from 'vitest'
import { acceptArtistInvitation, getArtists, onboardArtist } from './artists.ts'

afterEach(() => vi.restoreAllMocks())

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('artist API', () => {
  it('lists permitted artists through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [], meta: { pagination: {} } }))

    await getArtists()

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/artists?page%5Bsize%5D=25'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('onboards an artist and first Artist Admin without creator membership', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }, 201))
    const input = {
      artist: {
        name: 'Midnight Echo',
        biography: null,
        website_url: null,
      },
      administrator: { email: 'artist-admin@example.com' },
      relationship_type: 'managing_label' as const,
      creator_role: null,
      confirmation: true as const,
    }

    await onboardArtist('label-1', input)

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8000/api/v1/organizations/label-1/artist-onboardings',
      ),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      }),
    )
  })

  it('accepts an artist invitation through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await acceptArtistInvitation('plain-token')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/artist-invitations/accept'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'plain-token' }),
      }),
    )
  })
})
