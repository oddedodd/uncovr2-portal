import { z } from 'zod'
import { env } from './env.ts'

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export interface ApiSuccess<T> {
  data: T
  meta?: Record<string, unknown>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string
  readonly details?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined

  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split('; ')
    .find((candidate) => candidate.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined
}

function requestHeaders(init: RequestInit, requestId: string): Headers {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Request-ID', requestId)

  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const method = init.method?.toUpperCase() ?? 'GET'
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = readCookie('XSRF-TOKEN')
    if (csrfToken) headers.set('X-XSRF-TOKEN', csrfToken)
  }

  return headers
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined

  const contentType = response.headers.get('Content-Type') ?? ''
  return contentType.includes('application/json') ? response.json() : undefined
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiSuccess<T>> {
  const requestId = crypto.randomUUID()
  const response = await fetch(new URL(path, env.VITE_API_URL), {
    ...init,
    credentials: 'include',
    headers: requestHeaders(init, requestId),
  })
  const body = await parseBody(response)
  const responseRequestId = response.headers.get('X-Request-ID') ?? requestId

  if (!response.ok) {
    const parsedError = errorEnvelopeSchema.safeParse(body)
    if (parsedError.success) {
      throw new ApiError(
        response.status,
        parsedError.data.error.code,
        parsedError.data.error.message,
        responseRequestId,
        parsedError.data.error.details,
      )
    }

    throw new ApiError(
      response.status,
      'unexpected_response',
      'API-et returnerte et ukjent svar.',
      responseRequestId,
    )
  }

  return body as ApiSuccess<T>
}

export async function initializeCsrf(): Promise<void> {
  await apiRequest<never>('/sanctum/csrf-cookie')
}
