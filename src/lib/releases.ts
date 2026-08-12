import { apiRequest } from './api.ts'
import type { MediaReference } from './media.ts'
import type { CursorPagination } from './platformSearch.ts'

export interface Release {
  id: string
  owner: { type: 'organization' | 'artist'; id: string }
  type: string
  status: string
  title: string
  subtitle: string | null
  description: string | null
  release_date: string | null
  upc: string | null
  cover_media_id: string | null
  cover_media: MediaReference | null
  artists: Array<{
    artist_id: string
    name: string
    is_primary: boolean
    position: number
  }>
  editor_user_ids: string[]
  created_at: string
  updated_at: string
}

export interface ReleasePage {
  data: Release[]
  pagination: CursorPagination
}

export interface ReleaseListFilters {
  search?: string
  status?: string
  type?: string
}

export interface ReleaseMetadataInput {
  type: 'album' | 'ep' | 'single'
  title: string
  subtitle: string | null
  description: string | null
  release_date: string | null
  upc: string | null
}

export interface CreateReleaseInput extends ReleaseMetadataInput {
  owner_type: 'organization' | 'artist'
  owner_id: string
  primary_artist_id: string
  cover_media_id: string | null
}

export interface ReleaseArtistInput {
  artist_id: string
  is_primary: boolean
  position: number
}

interface ReleasePaginationMeta {
  pagination?: CursorPagination
}

export const releaseKeys = {
  all: ['releases'] as const,
  list: (
    cursor: { after?: string; before?: string } = {},
    filters: ReleaseListFilters = {},
  ) => ['releases', 'list', cursor.after, cursor.before, filters] as const,
  detail: (releaseId: string) => ['releases', 'detail', releaseId] as const,
}

export async function getReleases(
  cursor: { after?: string; before?: string } = {},
  filters: ReleaseListFilters = {},
): Promise<ReleasePage> {
  const params = new URLSearchParams({ 'page[size]': '25' })
  if (cursor.after) params.set('page[after]', cursor.after)
  if (cursor.before) params.set('page[before]', cursor.before)
  if (filters.search?.trim())
    params.set('filter[search]', filters.search.trim())
  if (filters.status) params.set('filter[status]', filters.status)
  if (filters.type) params.set('filter[type]', filters.type)
  const response = await apiRequest<Release[]>(
    `/api/v1/releases?${params.toString()}`,
  )
  const meta = response.meta as ReleasePaginationMeta | undefined

  return {
    data: response.data,
    pagination: meta?.pagination ?? {
      per_page: 25,
      next_cursor: null,
      previous_cursor: null,
      has_more: false,
    },
  }
}

export function getRelease(releaseId: string) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}`).then(
    (response) => response.data,
  )
}

export function createRelease(input: CreateReleaseInput) {
  return apiRequest<Release>('/api/v1/releases', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function updateRelease(
  releaseId: string,
  input: Partial<ReleaseMetadataInput & { cover_media_id: string | null }>,
) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function updateReleaseCover(
  releaseId: string,
  coverMediaId: string | null,
) {
  return updateRelease(releaseId, { cover_media_id: coverMediaId })
}

export function addReleaseArtist(releaseId: string, input: ReleaseArtistInput) {
  return apiRequest<{
    artist_id: string
    is_primary: boolean
    position: number
  }>(`/api/v1/releases/${releaseId}/artists`, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function removeReleaseArtist(releaseId: string, artistId: string) {
  return apiRequest<{ message: string }>(
    `/api/v1/releases/${releaseId}/artists/${artistId}`,
    { method: 'DELETE' },
  ).then((response) => response.data)
}
