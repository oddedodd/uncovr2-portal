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

export function updateReleaseCover(
  releaseId: string,
  coverMediaId: string | null,
) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ cover_media_id: coverMediaId }),
  }).then((response) => response.data)
}
