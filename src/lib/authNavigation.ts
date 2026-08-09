const invitationPaths = new Set([
  '/invitations/accept',
  '/artist-invitations/accept',
])

export function safeInvitationReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const url = new URL(value, 'http://portal.local')
  if (url.origin !== 'http://portal.local') return undefined
  if (!invitationPaths.has(url.pathname)) return undefined
  if (!url.searchParams.get('token')) return undefined

  return `${url.pathname}${url.search}`
}

export function readInvitationReturnTo(
  search: string,
  state: unknown,
): string | undefined {
  const stateReturnTo = safeInvitationReturnTo(
    (state as { returnTo?: unknown } | null)?.returnTo,
  )
  if (stateReturnTo) return stateReturnTo

  return safeInvitationReturnTo(new URLSearchParams(search).get('return_to'))
}

export function authRoute(
  path: string,
  returnTo?: string,
  parameters: Record<string, string> = {},
): string {
  const url = new URL(path, 'http://portal.local')
  Object.entries(parameters).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  )
  const safeReturnTo = safeInvitationReturnTo(returnTo)
  if (safeReturnTo) url.searchParams.set('return_to', safeReturnTo)

  return `${url.pathname}${url.search}`
}
