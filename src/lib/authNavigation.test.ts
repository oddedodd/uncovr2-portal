import { describe, expect, it } from 'vitest'
import {
  authRoute,
  readInvitationReturnTo,
  safeInvitationReturnTo,
} from './authNavigation.ts'

describe('invitation authentication navigation', () => {
  const returnTo = '/artist-invitations/accept?token=invite-token'

  it('keeps an invitation token in auth URLs across reloads', () => {
    const loginPath = authRoute('/login', returnTo)

    expect(loginPath).toBe(
      '/login?return_to=%2Fartist-invitations%2Faccept%3Ftoken%3Dinvite-token',
    )
    expect(
      readInvitationReturnTo(new URL(loginPath, 'http://portal').search, null),
    ).toBe(returnTo)
  })

  it('rejects external and unrelated return URLs', () => {
    expect(
      safeInvitationReturnTo('https://attacker.example/path'),
    ).toBeUndefined()
    expect(safeInvitationReturnTo('/account')).toBeUndefined()
    expect(safeInvitationReturnTo('/invitations/accept')).toBeUndefined()
  })
})
