import { apiRequest } from './api.ts'
import type { PlatformUserResult } from './platformSearch.ts'

export interface HierarchyRelease {
  id: string
  title: string
  type: 'album' | 'ep' | 'single'
  status: string
  release_date: string | null
}

export interface HierarchyScope {
  id: string
  status: 'active' | 'suspended'
  name: string
  relationship_id: string
  relationship_type: string
}

export interface OrganizationMembership {
  id: string
  role: 'label_admin' | 'label_user'
  status: 'active' | 'suspended'
  organization: {
    id: string
    status: 'active' | 'suspended'
    name: string
    artists: HierarchyScope[]
    releases: HierarchyRelease[]
  }
}

export interface ArtistMembership {
  id: string
  role: 'artist_admin' | 'artist_user'
  status: 'active' | 'suspended'
  artist: {
    id: string
    status: 'active' | 'suspended'
    name: string
    organizations: HierarchyScope[]
    releases: HierarchyRelease[]
  }
}

export interface PlatformUserDetail extends PlatformUserResult {
  suspended_at: string | null
  suspension_reason: string | null
  deletion_requested_at: string | null
  anonymized_at: string | null
  created_at: string
  updated_at: string
  memberships: {
    organizations: OrganizationMembership[]
    artists: ArtistMembership[]
  }
  release_editor_assignments: HierarchyRelease[]
}

export const platformUserKeys = {
  all: ['platform', 'users'] as const,
  detail: (userId: string) => ['platform', 'users', userId] as const,
}

export interface AuditedChangeInput<TValue extends string> {
  reason: string
  confirmation: string
  value: TValue
}

export interface MembershipCorrectionResult {
  id: string
  type: 'organization' | 'artist'
  scope: { id: string; name: string }
  user_id: string
  role: OrganizationMembership['role'] | ArtistMembership['role']
  status: 'active' | 'suspended'
}

export function getPlatformUser(userId: string, signal?: AbortSignal) {
  return apiRequest<PlatformUserDetail>(`/api/v1/users/${userId}`, {
    signal,
  }).then((response) => response.data)
}

export function updatePlatformUserStatus(
  userId: string,
  input: AuditedChangeInput<PlatformUserDetail['status']>,
) {
  return apiRequest<PlatformUserDetail>(`/api/v1/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: input.value,
      reason: input.reason,
      confirmation: input.confirmation,
    }),
  }).then((response) => response.data)
}

export function correctMembershipRole(
  userId: string,
  membershipId: string,
  type: 'organization' | 'artist',
  input: AuditedChangeInput<
    OrganizationMembership['role'] | ArtistMembership['role']
  >,
) {
  const membershipPath =
    type === 'organization' ? 'organization-memberships' : 'artist-memberships'

  return apiRequest<MembershipCorrectionResult>(
    `/api/v1/users/${userId}/${membershipPath}/${membershipId}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        role: input.value,
        reason: input.reason,
        confirmation: input.confirmation,
      }),
    },
  ).then((response) => response.data)
}
