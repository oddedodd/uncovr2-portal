import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, initializeCsrf } from './api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('sends credentials without a request ID header on GET requests', async () => {
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
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.has('X-Request-ID')).toBe(false)
  })

  it('does not send a request ID header when initializing CSRF', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await initializeCsrf()

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/sanctum/csrf-cookie'),
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.has('X-Request-ID')).toBe(false)
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

  it('does not send a request ID header on JSON mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'example' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/v1/example', {
      method: 'POST',
      body: JSON.stringify({ name: 'Example' }),
    })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.has('X-Request-ID')).toBe(false)
  })

  it('returns a stable network error when the API cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(apiRequest('/api/v1/me')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
      message: 'Kunne ikke kontakte Uncovr API-et.',
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    })
  })
})
