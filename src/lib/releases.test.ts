import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addReleaseArtist,
  createRelease,
  createReleasePage,
  createReleaseTrack,
  deleteReleaseTrack,
  createTrackPage,
  deleteReleasePage,
  getReleases,
  removeReleaseArtist,
  updateRelease,
  updateReleaseCover,
  updateReleasePage,
  updateReleaseTrack,
} from './releases.ts'

afterEach(() => vi.restoreAllMocks())

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('release API', () => {
  it('lists every permitted release through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [], meta: { pagination: {} } }))

    await getReleases()

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases?page%5Bsize%5D=25'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('sends supported release list filters to Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [], meta: { pagination: {} } }))

    await getReleases(
      { after: 'cursor-next' },
      { search: ' Signal ', status: 'published', type: 'single' },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8000/api/v1/releases?page%5Bsize%5D=25&page%5Bafter%5D=cursor-next&filter%5Bsearch%5D=Signal&filter%5Bstatus%5D=published&filter%5Btype%5D=single',
      ),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('attaches an album cover by media ID', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await updateReleaseCover('release-1', 'media-1')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ cover_media_id: 'media-1' }),
      }),
    )
  })

  it('creates releases through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await createRelease({
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
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
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
      }),
    )
  })

  it('updates release metadata through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await updateRelease('release-1', {
      type: 'album',
      title: 'Updated',
      subtitle: 'Deluxe',
      description: 'Notes',
      release_date: '2026-09-01',
      upc: '123456789012',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          type: 'album',
          title: 'Updated',
          subtitle: 'Deluxe',
          description: 'Notes',
          release_date: '2026-09-01',
          upc: '123456789012',
        }),
      }),
    )
  })

  it('attaches artists to releases through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await addReleaseArtist('release-1', {
      artist_id: 'artist-2',
      is_primary: true,
      position: 2,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/artists'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          artist_id: 'artist-2',
          is_primary: true,
          position: 2,
        }),
      }),
    )
  })

  it('removes artists from releases through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { message: 'Removed' } }))

    await removeReleaseArtist('release-1', 'artist-2')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8000/api/v1/releases/release-1/artists/artist-2',
      ),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('creates tracks through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await createReleaseTrack('release-1', {
      position: 1,
      title: 'Arrival',
      duration_ms: 183000,
      isrc: 'NOABC2600001',
      is_explicit: false,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/tracks'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          position: 1,
          title: 'Arrival',
          duration_ms: 183000,
          isrc: 'NOABC2600001',
          is_explicit: false,
        }),
      }),
    )
  })

  it('updates tracks through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await updateReleaseTrack('release-1', 'track-1', {
      position: 2,
      title: 'Departure',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/tracks/track-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ position: 2, title: 'Departure' }),
      }),
    )
  })

  it('deletes tracks through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { message: 'Deleted' } }))

    await deleteReleaseTrack('release-1', 'track-1')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/tracks/track-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('creates release and track pages through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse({ data: {} })))

    await createReleasePage('release-1', { position: 1, title: 'Story' })
    await createTrackPage('track-1', { position: 1, title: 'Lyrics' })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/pages'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ position: 1, title: 'Story' }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/tracks/track-1/pages'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ position: 1, title: 'Lyrics' }),
      }),
    )
  })

  it('updates and deletes pages through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse({ data: {} })))

    await updateReleasePage('page-1', { position: 2, title: null })
    await deleteReleasePage('page-1')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/pages/page-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ position: 2, title: null }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/pages/page-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
