import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMediaDownloadUrls, uploadImage, uploadMedia } from './media.ts'

afterEach(() => vi.restoreAllMocks())

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('media API', () => {
  it('uploads through a signed URL without portal credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'media-1' }, 201))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: 'upload-1',
            method: 'PUT',
            url: 'https://storage.example.test/object?token=secret',
            mime_type: 'image/png',
            maximum_byte_size: 25_000_000,
          },
          201,
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'media-1',
          status: 'ready',
          mime_type: 'image/png',
          width: 800,
          height: 800,
        }),
      )

    const file = new File(['image'], 'cover.png', { type: 'image/png' })
    await uploadImage('artist', 'artist-1', file)

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://storage.example.test/object?token=secret',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: file,
      },
    )
    expect(fetchMock.mock.calls[2]?.[1]).not.toHaveProperty('credentials')
  })

  it('creates reusable video media with the requested kind', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'media-1' }, 201))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: 'upload-1',
            method: 'PUT',
            url: 'https://storage.example.test/video?token=secret',
            mime_type: 'video/mp4',
            maximum_byte_size: 25_000_000,
          },
          201,
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'media-1',
          status: 'ready',
          mime_type: 'video/mp4',
          width: null,
          height: null,
        }),
      )

    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' })
    await uploadMedia('organization', 'label-1', 'video', file)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL('http://localhost:8000/api/v1/media'),
      expect.objectContaining({
        body: JSON.stringify({
          owner_type: 'organization',
          owner_id: 'label-1',
          kind: 'video',
          original_filename: 'clip.mp4',
          mime_type: 'video/mp4',
          byte_size: file.size,
          width: null,
          height: null,
          metadata: null,
        }),
      }),
    )
  })

  it('gets temporary download URLs in one Laravel request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        expires_in: 600,
        items: [{ media_id: 'media-1', url: 'https://signed.example/1' }],
      }),
    )

    const urls = await getMediaDownloadUrls(['media-1'])

    expect(urls.get('media-1')).toBe('https://signed.example/1')
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/media/downloads'),
      expect.objectContaining({
        credentials: 'include',
        body: JSON.stringify({ media_ids: ['media-1'] }),
      }),
    )
  })
})
