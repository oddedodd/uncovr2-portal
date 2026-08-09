import { apiRequest } from './api.ts'

export interface PlatformScope {
  id: string
  status: 'active' | 'suspended'
  profile: {
    name: string
  }
}

export interface PlatformRelease {
  id: string
  status: string
  title: string
}

export interface PlatformOverview {
  organizations: PlatformScope[]
  artists: PlatformScope[]
  releases: PlatformRelease[]
  releasesHaveMore: boolean
}

export interface PlatformSummary {
  organizations: number
  suspendedOrganizations: number
  artists: number
  suspendedArtists: number
  releases: number
  releasesHaveMore: boolean
  releasesAwaitingReview: number
  publishedReleases: number
}

interface ReleasePagination {
  pagination?: {
    has_more?: boolean
  }
}

export const platformKeys = {
  overview: ['platform', 'overview'] as const,
  health: (check: 'live' | 'ready') => ['platform', 'health', check] as const,
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const [organizations, artists, releases] = await Promise.all([
    apiRequest<PlatformScope[]>('/api/v1/organizations'),
    apiRequest<PlatformScope[]>('/api/v1/artists'),
    apiRequest<PlatformRelease[]>('/api/v1/releases?page[size]=100'),
  ])

  const releaseMeta = releases.meta as ReleasePagination | undefined

  return {
    organizations: organizations.data,
    artists: artists.data,
    releases: releases.data,
    releasesHaveMore: releaseMeta?.pagination?.has_more === true,
  }
}

export function getHealthCheck(check: 'live' | 'ready') {
  return apiRequest<{ status: 'ok' | 'ready' }>(`/api/v1/health/${check}`).then(
    (response) => response.data,
  )
}

export function summarizePlatform(overview: PlatformOverview): PlatformSummary {
  return {
    organizations: overview.organizations.length,
    suspendedOrganizations: overview.organizations.filter(
      (organization) => organization.status === 'suspended',
    ).length,
    artists: overview.artists.length,
    suspendedArtists: overview.artists.filter(
      (artist) => artist.status === 'suspended',
    ).length,
    releases: overview.releases.length,
    releasesHaveMore: overview.releasesHaveMore,
    releasesAwaitingReview: overview.releases.filter(
      (release) => release.status === 'submitted',
    ).length,
    publishedReleases: overview.releases.filter(
      (release) => release.status === 'published',
    ).length,
  }
}
