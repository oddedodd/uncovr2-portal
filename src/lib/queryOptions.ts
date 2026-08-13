import { queryOptions } from '@tanstack/react-query'
import { artistKeys, getArtist, getArtists } from './artists.ts'
import { getArtistMembers, artistTeamKeys } from './artistTeam.ts'
import {
  authKeys,
  getCurrentUser,
  getCurrentWorkspaces,
  getSessions,
} from './auth.ts'
import {
  getOrganization,
  getOrganizations,
  organizationKeys,
} from './organizations.ts'
import {
  getOrganizationMembers,
  organizationTeamKeys,
} from './organizationTeam.ts'
import {
  getHealthCheck,
  getPlatformOverview,
  platformKeys,
} from './platform.ts'
import { getPlatformUser, platformUserKeys } from './platformUsers.ts'
import {
  getRelease,
  getReleases,
  releaseKeys,
  type ReleaseListFilters,
} from './releases.ts'

/**
 * Hentedeklarasjonene ligger samlet her, og ikke i domenemodulene, fordi de må
 * kalle hentefunksjonene *over* en modulgrense. Et kall til `getRelease` inne i
 * `releases.ts` binder seg til den lokale funksjonen, så en `vi.mock` av
 * modulen ville ikke fanget det opp — samme fella som er dokumentert for
 * `mediaDownloadQueryOptions` i `media.ts`.
 *
 * Samlingen gir dessuten route-loaderne og komponentene én felles kilde til
 * query-nøkkel og hentefunksjon, slik at de ikke kan komme i utakt.
 */

/**
 * Innloggingssjekken holdes fersk i fem minutter. Den avgjør om hele
 * ruttetreet får rendre, så en refetch ved hver navigering ville lagt en
 * rundtur foran hver sidevisning.
 */
const authBootstrapStaleTimeMs = 5 * 60 * 1000

export const currentUserQueryOptions = queryOptions({
  queryKey: authKeys.currentUser,
  queryFn: ({ signal }) => getCurrentUser(signal),
  staleTime: authBootstrapStaleTimeMs,
})

export const workspacesQueryOptions = queryOptions({
  queryKey: authKeys.workspaces,
  queryFn: ({ signal }) => getCurrentWorkspaces(signal),
  staleTime: authBootstrapStaleTimeMs,
})

export const sessionsQueryOptions = queryOptions({
  queryKey: authKeys.sessions,
  queryFn: ({ signal }) => getSessions(signal),
})

export function releaseListQueryOptions(
  cursor: { after?: string; before?: string } = {},
  filters: ReleaseListFilters = {},
) {
  return queryOptions({
    queryKey: releaseKeys.list(cursor, filters),
    queryFn: ({ signal }) => getReleases(cursor, filters, signal),
  })
}

export function releaseDetailQueryOptions(releaseId: string) {
  return queryOptions({
    queryKey: releaseKeys.detail(releaseId),
    queryFn: ({ signal }) => getRelease(releaseId, signal),
  })
}

export function artistListQueryOptions(
  cursor: { after?: string; before?: string } = {},
) {
  return queryOptions({
    queryKey: artistKeys.list(cursor.after, cursor.before),
    queryFn: ({ signal }) => getArtists(cursor, signal),
  })
}

export function artistDetailQueryOptions(artistId: string) {
  return queryOptions({
    queryKey: artistKeys.detail(artistId),
    queryFn: ({ signal }) => getArtist(artistId, signal),
  })
}

export function organizationListQueryOptions(
  cursor: { after?: string; before?: string } = {},
) {
  return queryOptions({
    queryKey: organizationKeys.list(cursor.after, cursor.before),
    queryFn: ({ signal }) => getOrganizations(cursor, signal),
  })
}

export function organizationDetailQueryOptions(organizationId: string) {
  return queryOptions({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: ({ signal }) => getOrganization(organizationId, signal),
  })
}

export function organizationMembersQueryOptions(organizationId: string) {
  return queryOptions({
    queryKey: organizationTeamKeys.all(organizationId),
    queryFn: ({ signal }) => getOrganizationMembers(organizationId, signal),
  })
}

export function artistMembersQueryOptions(artistId: string) {
  return queryOptions({
    queryKey: artistTeamKeys.all(artistId),
    queryFn: ({ signal }) => getArtistMembers(artistId, signal),
  })
}

export const platformOverviewQueryOptions = queryOptions({
  queryKey: platformKeys.overview,
  queryFn: ({ signal }) => getPlatformOverview(signal),
})

export function healthCheckQueryOptions(check: 'live' | 'ready') {
  return queryOptions({
    queryKey: platformKeys.health(check),
    queryFn: ({ signal }) => getHealthCheck(check, signal),
  })
}

export function platformUserDetailQueryOptions(userId: string) {
  return queryOptions({
    queryKey: platformUserKeys.detail(userId),
    queryFn: ({ signal }) => getPlatformUser(userId, signal),
  })
}
