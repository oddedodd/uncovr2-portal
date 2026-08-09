import { apiRequest } from './api.ts'
import type { CursorPagination } from './platformSearch.ts'
import type { MediaReference } from './media.ts'

export interface Artist {
  id: string
  status: 'active' | 'suspended'
  profile: {
    name: string
    biography: string | null
    website_url: string | null
    logo_media_id: string | null
    logo_media: MediaReference | null
    image_media_id: string | null
    image_media: MediaReference | null
  }
  created_at: string
  updated_at: string
}

export interface ArtistPage {
  data: Artist[]
  pagination: CursorPagination
}

export interface ArtistOnboardingInput {
  artist: {
    name: string
    biography: string | null
    website_url: string | null
  }
  administrator: { email: string }
  relationship_type: 'managing_label' | 'distributor'
  creator_role: null
  confirmation: true
}

export interface ArtistOnboardingResult {
  artist: Artist
  relationship: {
    id: string
    organization_id: string
    artist_id: string
    relationship_type: ArtistOnboardingInput['relationship_type']
    started_at: string
  }
  administrator_invitation: {
    id: string
    email: string
    role: 'artist_admin'
    expires_at: string
  }
  creator_membership: null
}

interface ArtistPaginationMeta {
  pagination?: CursorPagination
}

export const artistKeys = {
  all: ['artists'] as const,
  list: (after?: string, before?: string) =>
    ['artists', 'list', after, before] as const,
  detail: (artistId: string) => ['artists', 'detail', artistId] as const,
}

export function getArtist(artistId: string) {
  return apiRequest<Artist>(`/api/v1/artists/${artistId}`).then(
    (response) => response.data,
  )
}

export function updateArtist(
  artistId: string,
  input: Partial<
    Pick<Artist['profile'], 'name' | 'biography' | 'website_url'> & {
      logo_media_id: string | null
      image_media_id: string | null
    }
  >,
) {
  return apiRequest<Artist>(`/api/v1/artists/${artistId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function uploadArtistLogo(artistId: string, file: File) {
  const formData = new FormData()
  formData.append('image', file)

  return apiRequest<Artist>(`/api/v1/artists/${artistId}/logo`, {
    method: 'POST',
    body: formData,
  }).then((response) => response.data)
}

export function uploadArtistImage(artistId: string, file: File) {
  const formData = new FormData()
  formData.append('image', file)

  return apiRequest<Artist>(`/api/v1/artists/${artistId}/image`, {
    method: 'POST',
    body: formData,
  }).then((response) => response.data)
}

export async function getArtists(
  cursor: { after?: string; before?: string } = {},
): Promise<ArtistPage> {
  const params = new URLSearchParams({ 'page[size]': '25' })
  if (cursor.after) params.set('page[after]', cursor.after)
  if (cursor.before) params.set('page[before]', cursor.before)

  const response = await apiRequest<Artist[]>(
    `/api/v1/artists?${params.toString()}`,
  )
  const meta = response.meta as ArtistPaginationMeta | undefined

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

export function onboardArtist(
  organizationId: string,
  input: ArtistOnboardingInput,
) {
  return apiRequest<ArtistOnboardingResult>(
    `/api/v1/organizations/${organizationId}/artist-onboardings`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data)
}

export function acceptArtistInvitation(token: string) {
  return apiRequest<{
    membership_id: string
    artist_id: string
    role: 'artist_admin' | 'artist_user'
  }>('/api/v1/artist-invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }).then((response) => response.data)
}
