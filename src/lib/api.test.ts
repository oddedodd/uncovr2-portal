import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('sends credentials and a request ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'example' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': '3bd53235-b00b-4306-a532-3a03e7726f4c',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest<{ id: string }>('/api/v1/example'),
    ).resolves.toEqual({
      data: { id: 'example' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/example'),
      expect.objectContaining({ credentials: 'include' }),
    )
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('X-Request-ID')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('turns the Laravel error envelope into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'validation_failed',
              message: 'The submitted data is invalid.',
              details: { fields: { email: ['Email is required.'] } },
            },
          }),
          {
            status: 422,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': '7dc95ecf-9c3c-4ff0-806f-6c661f4e7834',
            },
          },
        ),
      ),
    )

    const request = apiRequest('/api/v1/example')
    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({
      status: 422,
      code: 'validation_failed',
      requestId: '7dc95ecf-9c3c-4ff0-806f-6c661f4e7834',
    })
  })
})
