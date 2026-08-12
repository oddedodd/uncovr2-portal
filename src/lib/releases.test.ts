import { afterEach, describe, expect, it, vi } from 'vitest'
import { getReleases, updateReleaseCover } from './releases.ts'

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
})
