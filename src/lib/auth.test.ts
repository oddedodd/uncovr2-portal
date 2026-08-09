import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  initializeCsrf: vi.fn(),
}))

vi.mock('./api.ts', () => apiMocks)

import { login, register } from './auth.ts'

beforeEach(() => {
  apiMocks.apiRequest.mockReset()
  apiMocks.initializeCsrf.mockReset()
})

describe('login', () => {
  it('initializes Sanctum CSRF before submitting a portal login', async () => {
    const order: string[] = []
    apiMocks.initializeCsrf.mockImplementation(async () => {
      order.push('csrf')
    })
    apiMocks.apiRequest.mockImplementation(async () => {
      order.push('login')
      return { data: {} }
    })

    await login('ada@example.com', 'a secure passphrase')

    expect(order).toEqual(['csrf', 'login'])
    expect(apiMocks.apiRequest).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
    const request = apiMocks.apiRequest.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({
      email: 'ada@example.com',
      password: 'a secure passphrase',
      client_type: 'portal',
      device: { name: 'Uncovr adminportal' },
    })
  })

  it('initializes Sanctum CSRF before registration', async () => {
    apiMocks.apiRequest.mockResolvedValue({ data: { message: 'Accepted' } })

    await register({
      display_name: 'Ada Artist',
      email: 'ada@example.com',
      password: 'a secure passphrase',
      password_confirmation: 'a secure passphrase',
      consents: {
        terms: true,
        privacy: true,
        marketing_email: false,
        marketing_push: false,
      },
    })

    expect(apiMocks.initializeCsrf).toHaveBeenCalledOnce()
    expect(apiMocks.apiRequest).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
