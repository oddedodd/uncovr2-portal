import { apiRequest } from './api.ts'

export interface ArtistMember {
  id: string
  artist_id: string
  user: {
    id: string
    email: string
    display_name: string | null
  }
  role: 'artist_admin' | 'artist_user'
  status: 'active' | 'suspended'
}

export interface ArtistInvitation {
  id: string
  artist_id: string
  email: string
  role: ArtistMember['role']
  expires_at: string
  last_sent_at: string
  send_count: number
}

export const artistTeamKeys = {
  all: (artistId: string) => ['artists', artistId, 'members'] as const,
}

export function getArtistMembers(artistId: string, signal?: AbortSignal) {
  return apiRequest<ArtistMember[]>(`/api/v1/artists/${artistId}/members`, {
    signal,
  }).then((response) => response.data)
}

export function inviteArtistMember(
  artistId: string,
  input: { email: string; role: ArtistMember['role'] },
) {
  return apiRequest<ArtistInvitation>(
    `/api/v1/artists/${artistId}/invitations`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data)
}

export function updateArtistMember(
  artistId: string,
  membershipId: string,
  input: Partial<Pick<ArtistMember, 'role' | 'status'>>,
) {
  return apiRequest<ArtistMember>(
    `/api/v1/artists/${artistId}/members/${membershipId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  ).then((response) => response.data)
}

export function removeArtistMember(artistId: string, membershipId: string) {
  return apiRequest<{ message: string }>(
    `/api/v1/artists/${artistId}/members/${membershipId}`,
    { method: 'DELETE' },
  )
}
