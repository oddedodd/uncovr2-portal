import { type QueryClient } from '@tanstack/react-query'
import { apiRequest } from './api.ts'
import type { MediaReference } from './media.ts'
import type { CursorPagination } from './platformSearch.ts'

export type ReleaseStatus =
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'unpublished'
  | 'archived'

/**
 * Laravel sender denne blokken per utgivelse. Den uttrykker rollekapabilitet,
 * ikke tilstandsmaskin-gyldighet: `can_submit` betyr at brukeren har lov til å
 * sende inn, ikke at utgivelsen er komplett nok — API-et kan fortsatt svare 422.
 *
 * Rettigheter skal aldri utledes fra rolle eller redaktørlista i portalen, og
 * blokken hører til én utgivelse. Den må derfor ikke gjenbrukes på tvers.
 */
export interface ReleasePermissions {
  can_update: boolean
  can_submit: boolean
  can_delete: boolean
  can_approve: boolean
  can_publish: boolean
  can_manage_editors: boolean
}

export interface ReleaseEditor {
  user_id: string
  display_name: string | null
}

export interface ReleaseLifecycle {
  submitted_at: string | null
  approved_at: string | null
  scheduled_for: string | null
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
  publication_version: number
}

export interface ReleaseSummary {
  id: string
  owner: { type: 'organization' | 'artist'; id: string }
  type: string
  status: ReleaseStatus
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
  editors: ReleaseEditor[]
  /** @deprecated Bruk `editors`. Feltet finnes fortsatt i svaret fra Laravel. */
  editor_user_ids: string[]
  permissions: ReleasePermissions
  created_at: string
  updated_at: string
}

export interface Release extends ReleaseSummary {
  description: string | null
  upc: string | null
  lifecycle?: ReleaseLifecycle
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
  assigned_to_me?: boolean
  owner_id?: string
  owner_type?: 'organization' | 'artist'
  search?: string
  status?: string
  type?: string
}

const releaseStatusLabels: Record<ReleaseStatus, string> = {
  draft: 'Utkast',
  review: 'Til vurdering',
  scheduled: 'Planlagt',
  published: 'Publisert',
  unpublished: 'Avpublisert',
  archived: 'Arkivert',
}

export function releaseStatusLabel(status: string) {
  return releaseStatusLabels[status as ReleaseStatus] ?? status
}

/**
 * Laravel tillater bare skriving mens utgivelsen er et utkast eller avpublisert.
 * Statusen brukes ikke til å avgjøre om brukeren *får* redigere — det gjør
 * `permissions.can_update` — men til å forklare hvorfor når svaret er nei.
 */
export function isEditableReleaseStatus(status: string) {
  return status === 'draft' || status === 'unpublished'
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
  signal?: AbortSignal,
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
  // Serverside tildelingsfilter. Listen er markørpaginert, så klientside-
  // filtrering på `permissions.can_update` kunne gitt helt tomme sider.
  if (filters.assigned_to_me) params.set('filter[assigned_to_me]', '1')
  const response = await apiRequest<ReleaseSummary[]>(
    `/api/v1/releases?${params.toString()}`,
    { signal },
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

export function getRelease(releaseId: string, signal?: AbortSignal) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}`, { signal }).then(
    (response) => response.data,
  )
}

/**
 * Listeraden inneholder allerede tittel, artister, status, eier og omslag, så
 * detaljsiden kan male toppen umiddelbart i stedet for å vente på en rundtur.
 * `description` og `upc` finnes ikke i sammendraget: de mates til ukontrollerte
 * skjemafelt, og siden skjuler derfor de redigerbare seksjonene til ekte data
 * har landet (`isPlaceholderData`). Verdiene her er ren typeutfylling.
 */
export function findCachedReleaseSummary(
  client: QueryClient,
  releaseId: string,
): Release | undefined {
  for (const [, page] of client.getQueriesData<ReleasePage>({
    queryKey: releaseKeys.lists(),
  })) {
    const summary = page?.data.find((release) => release.id === releaseId)
    if (summary) return { ...summary, description: null, upc: null }
  }

  return undefined
}

/**
 * Skrivesvarene fra Laravel er typet med `pages` som valgfri. Erstattes hele
 * cache-oppføringen, forsvinner sider og blokker fra sideredigereren dersom
 * svaret utelater dem. Derfor merges det inn i stedet.
 */
export function mergeReleaseDetail(updated: Release) {
  return (previous: Release | undefined): Release =>
    previous
      ? { ...previous, ...updated, pages: updated.pages ?? previous.pages }
      : updated
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

export function deleteRelease(releaseId: string) {
  return apiRequest<{ message: string }>(`/api/v1/releases/${releaseId}`, {
    method: 'DELETE',
  }).then((response) => response.data)
}

/**
 * `userId` er brukerens ULID (`user.id` i medlemslista), ikke medlemskapets id.
 *
 * Laravel svarer 201 på en ny tildeling, som også sender e-post til brukeren,
 * og 200 når tildelingen allerede fantes. Begge er suksess, og API-klienten
 * skiller ikke på statuskoden.
 */
export function assignReleaseEditor(releaseId: string, userId: string) {
  return apiRequest<{ user_id: string }>(
    `/api/v1/releases/${releaseId}/editors`,
    { method: 'POST', body: JSON.stringify({ user_id: userId }) },
  ).then((response) => response.data)
}

export function removeReleaseEditor(releaseId: string, userId: string) {
  return apiRequest<{ message: string }>(
    `/api/v1/releases/${releaseId}/editors/${userId}`,
    { method: 'DELETE' },
  ).then((response) => response.data)
}

export function submitRelease(releaseId: string, note: string | null = null) {
  return apiRequest<{ approval_request_id: string; status: string }>(
    `/api/v1/releases/${releaseId}/submit`,
    { method: 'POST', body: JSON.stringify({ note }) },
  ).then((response) => response.data)
}

export function decideRelease(
  releaseId: string,
  approve: boolean,
  note: string | null = null,
) {
  return apiRequest<Release>(
    `/api/v1/releases/${releaseId}/${approve ? 'approve' : 'reject'}`,
    { method: 'POST', body: JSON.stringify({ note }) },
  ).then((response) => response.data)
}

export function scheduleRelease(releaseId: string, publishAt: string) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ publish_at: publishAt }),
  }).then((response) => response.data)
}

export function publishRelease(releaseId: string) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}/publish`, {
    method: 'POST',
  }).then((response) => response.data)
}

export function unpublishRelease(releaseId: string) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}/unpublish`, {
    method: 'POST',
  }).then((response) => response.data)
}

export function archiveRelease(releaseId: string) {
  return apiRequest<Release>(`/api/v1/releases/${releaseId}/archive`, {
    method: 'POST',
  }).then((response) => response.data)
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
