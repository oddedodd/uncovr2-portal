import { apiRequest } from './api.ts'
import type { MediaReference } from './media.ts'
import type { CursorPagination } from './platformSearch.ts'

export interface ReleaseSummary {
  id: string
  owner: { type: 'organization' | 'artist'; id: string }
  type: string
  status: string
  title: string
  subtitle: string | null
  release_date: string | null
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

export interface Release extends ReleaseSummary {
  description: string | null
  upc: string | null
  pages?: ReleaseContentPage[]
}

export interface ReleaseContentPage {
  id: string
  parent?: { type: 'release'; id: string }
  position: number
  title: string | null
  blocks?: ReleaseContentBlock[]
}

export type ReleaseContentBlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'gallery'
  | 'video'
  | 'quote'
  | 'lyrics'

export type ReleaseContentBlockPayload =
  | { text: string; level: number }
  | { body: string }
  | { media_id: string; alt_text: string; caption: string | null }
  | {
      items: Array<{
        media_id: string
        alt_text: string
        caption: string | null
      }>
    }
  | { url: string | null; media_id: string | null; caption: string | null }
  | { text: string; attribution: string | null }
  | { text: string; language: string | null }
  | Record<string, unknown>

export interface ReleaseContentBlock {
  id: string
  position: number
  type: ReleaseContentBlockType
  version: number
  payload: ReleaseContentBlockPayload
}

export interface ReleasePage {
  data: ReleaseSummary[]
  pagination: CursorPagination
}

export interface ReleaseListFilters {
  artist_id?: string
  owner_id?: string
  owner_type?: 'organization' | 'artist'
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

export interface ReleasePageInput {
  position: number
  title: string | null
}

export interface ReleaseContentBlockInput {
  position: number
  type: ReleaseContentBlockType
  payload: ReleaseContentBlockPayload
}

interface ReleasePaginationMeta {
  pagination?: CursorPagination
}

/**
 * `all` er et prefiks av både `list` og `detail`, og invalidateQueries matcher
 * på prefiks. Bruk derfor `lists()` eller `detail()` etter en skriving — `all`
 * er kun for å tømme alt, som ved utlogging eller bytte av arbeidsområde.
 */
export const releaseKeys = {
  all: ['releases'] as const,
  lists: () => ['releases', 'list'] as const,
  list: (
    cursor: { after?: string; before?: string } = {},
    filters: ReleaseListFilters = {},
  ) => ['releases', 'list', cursor.after, cursor.before, filters] as const,
  details: () => ['releases', 'detail'] as const,
  detail: (releaseId: string) => ['releases', 'detail', releaseId] as const,
}

export async function getReleases(
  cursor: { after?: string; before?: string } = {},
  filters: ReleaseListFilters = {},
): Promise<ReleasePage> {
  const params = new URLSearchParams({ 'page[size]': '25' })
  if (cursor.after) params.set('page[after]', cursor.after)
  if (cursor.before) params.set('page[before]', cursor.before)
  if (filters.artist_id) params.set('filter[artist_id]', filters.artist_id)
  if (filters.owner_type) params.set('filter[owner_type]', filters.owner_type)
  if (filters.owner_id) params.set('filter[owner_id]', filters.owner_id)
  if (filters.search?.trim())
    params.set('filter[search]', filters.search.trim())
  if (filters.status) params.set('filter[status]', filters.status)
  if (filters.type) params.set('filter[type]', filters.type)
  const response = await apiRequest<ReleaseSummary[]>(
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

export function createReleasePage(releaseId: string, input: ReleasePageInput) {
  return apiRequest<ReleaseContentPage>(`/api/v1/releases/${releaseId}/pages`, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function updateReleasePage(
  pageId: string,
  input: Partial<ReleasePageInput>,
) {
  return apiRequest<ReleaseContentPage>(`/api/v1/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function deleteReleasePage(pageId: string) {
  return apiRequest<{ message: string }>(`/api/v1/pages/${pageId}`, {
    method: 'DELETE',
  }).then((response) => response.data)
}

export function createContentBlock(
  pageId: string,
  input: ReleaseContentBlockInput,
) {
  return apiRequest<ReleaseContentBlock>(`/api/v1/pages/${pageId}/blocks`, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function updateContentBlock(
  pageId: string,
  blockId: string,
  input: Partial<ReleaseContentBlockInput>,
) {
  return apiRequest<ReleaseContentBlock>(
    `/api/v1/pages/${pageId}/blocks/${blockId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data)
}

export function deleteContentBlock(pageId: string, blockId: string) {
  return apiRequest<{ message: string }>(
    `/api/v1/pages/${pageId}/blocks/${blockId}`,
    { method: 'DELETE' },
  ).then((response) => response.data)
}
