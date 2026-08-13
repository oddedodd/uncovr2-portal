import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addReleaseArtist,
  archiveRelease,
  assignReleaseEditor,
  createContentBlock,
  createRelease,
  createReleasePage,
  decideRelease,
  deleteContentBlock,
  deleteRelease,
  deleteReleasePage,
  getReleases,
  isEditableReleaseStatus,
  publishRelease,
  releaseStatusLabel,
  removeReleaseArtist,
  removeReleaseEditor,
  scheduleRelease,
  submitRelease,
  unpublishRelease,
  updateRelease,
  updateReleaseCover,
  updateContentBlock,
  updateReleasePage,
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
      {
        artist_id: 'artist-1',
        owner_id: 'label-1',
        owner_type: 'organization',
        search: ' Signal ',
        status: 'published',
        type: 'single',
      },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8000/api/v1/releases?page%5Bsize%5D=25&page%5Bafter%5D=cursor-next&filter%5Bartist_id%5D=artist-1&filter%5Bowner_type%5D=organization&filter%5Bowner_id%5D=label-1&filter%5Bsearch%5D=Signal&filter%5Bstatus%5D=published&filter%5Btype%5D=single',
      ),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('asks Laravel for the releases assigned to the current user', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: [], meta: { pagination: {} } }))

    await getReleases({}, { assigned_to_me: true, artist_id: 'artist-1' })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'http://localhost:8000/api/v1/releases?page%5Bsize%5D=25&filter%5Bartist_id%5D=artist-1&filter%5Bassigned_to_me%5D=1',
      ),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('assigns and removes release editors by user ULID', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse({ data: {} })))

    await assignReleaseEditor('release-1', 'user-1')
    await removeReleaseEditor('release-1', 'user-1')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/editors'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ user_id: 'user-1' }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/editors/user-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('drives the release lifecycle through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse({ data: {} })))

    await submitRelease('release-1')
    await decideRelease('release-1', true)
    await decideRelease('release-1', false)
    await scheduleRelease('release-1', '2026-09-01T10:00:00.000Z')
    await publishRelease('release-1')
    await unpublishRelease('release-1')
    await archiveRelease('release-1')
    await deleteRelease('release-1')

    const requested = fetchMock.mock.calls.map(([url, init]) => [
      String(url).replace(
        'http://localhost:8000/api/v1/releases/release-1',
        '',
      ),
      (init as RequestInit).method,
    ])
    expect(requested).toEqual([
      ['/submit', 'POST'],
      ['/approve', 'POST'],
      ['/reject', 'POST'],
      ['/schedule', 'POST'],
      ['/publish', 'POST'],
      ['/unpublish', 'POST'],
      ['/archive', 'POST'],
      ['', 'DELETE'],
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/schedule'),
      expect.objectContaining({
        body: JSON.stringify({ publish_at: '2026-09-01T10:00:00.000Z' }),
      }),
    )
  })

  it('names the statuses Laravel allows editing in', () => {
    expect(isEditableReleaseStatus('draft')).toBe(true)
    expect(isEditableReleaseStatus('unpublished')).toBe(true)
    expect(isEditableReleaseStatus('review')).toBe(false)
    expect(releaseStatusLabel('published')).toBe('Publisert')
    // Ukjente statuser vises som de er i stedet for å bli borte.
    expect(releaseStatusLabel('mystery')).toBe('mystery')
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

  it('creates release pages through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await createReleasePage('release-1', { position: 1, title: 'Story' })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/releases/release-1/pages'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ position: 1, title: 'Story' }),
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

  it('creates content blocks through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: {} }))

    await createContentBlock('page-1', {
      position: 1,
      type: 'text',
      payload: { body: 'The story' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/pages/page-1/blocks'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          position: 1,
          type: 'text',
          payload: { body: 'The story' },
        }),
      }),
    )
  })

  it('updates and deletes content blocks through Laravel', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse({ data: {} })))

    await updateContentBlock('page-1', 'block-1', {
      position: 2,
      type: 'heading',
      payload: { text: 'Title', level: 2 },
    })
    await deleteContentBlock('page-1', 'block-1')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/pages/page-1/blocks/block-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          position: 2,
          type: 'heading',
          payload: { text: 'Title', level: 2 },
        }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/pages/page-1/blocks/block-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
