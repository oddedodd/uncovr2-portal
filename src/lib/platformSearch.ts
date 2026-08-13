import { apiRequest } from './api.ts'

export type PlatformSearchResource =
  | 'users'
  | 'organizations'
  | 'artists'
  | 'releases'

export interface PlatformUserResult {
  id: string
  email: string
  display_name: string | null
  is_superadmin: boolean
  status: 'active' | 'suspended'
  email_verified_at: string | null
}

export interface PlatformScopeResult {
  id: string
  status: 'active' | 'suspended'
  profile: {
    name: string
    legal_name?: string | null
  }
}

export interface PlatformReleaseResult {
  id: string
  title: string
  subtitle: string | null
  type: 'album' | 'ep' | 'single'
  status: string
  release_date: string | null
  artists: Array<{ artist_id: string; name: string; is_primary: boolean }>
}

export interface SearchResultMap {
  users: PlatformUserResult
  organizations: PlatformScopeResult
  artists: PlatformScopeResult
  releases: PlatformReleaseResult
}

export interface CursorPagination {
  per_page: number
  next_cursor: string | null
  previous_cursor: string | null
  has_more: boolean
}

export interface PlatformSearchPage<T> {
  data: T[]
  pagination: CursorPagination
}

interface SearchPaginationMeta {
  pagination?: CursorPagination
}

export const platformSearchResources: PlatformSearchResource[] = [
  'users',
  'organizations',
  'artists',
  'releases',
]

export const platformSearchKeys = {
  result: (
    resource: PlatformSearchResource,
    search: string,
    after?: string,
    before?: string,
  ) => ['platform', 'search', resource, search, after, before] as const,
}

export async function searchPlatformResource<
  TResource extends PlatformSearchResource,
>(
  resource: TResource,
  search: string,
  cursor: { after?: string; before?: string } = {},
  signal?: AbortSignal,
): Promise<PlatformSearchPage<SearchResultMap[TResource]>> {
  const params = new URLSearchParams({
    'filter[search]': search,
    'page[size]': '10',
  })

  if (cursor.after) params.set('page[after]', cursor.after)
  if (cursor.before) params.set('page[before]', cursor.before)

  const response = await apiRequest<SearchResultMap[TResource][]>(
    `/api/v1/${resource}?${params.toString()}`,
    { signal },
  )
  const meta = response.meta as SearchPaginationMeta | undefined

  return {
    data: response.data,
    pagination: meta?.pagination ?? {
      per_page: 10,
      next_cursor: null,
      previous_cursor: null,
      has_more: false,
    },
  }
}
