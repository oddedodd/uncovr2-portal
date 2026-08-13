import { apiRequest } from './api.ts'
import type { OrganizationInvitation } from './organizations.ts'

export interface OrganizationMember {
  id: string
  organization_id: string
  user: {
    id: string
    email: string
    display_name: string | null
  }
  role: 'label_admin' | 'label_user'
  status: 'active' | 'suspended'
}

export const organizationTeamKeys = {
  all: (organizationId: string) =>
    ['organizations', organizationId, 'members'] as const,
}

export function getOrganizationMembers(
  organizationId: string,
  signal?: AbortSignal,
) {
  return apiRequest<OrganizationMember[]>(
    `/api/v1/organizations/${organizationId}/members`,
    { signal },
  ).then((response) => response.data)
}

export function inviteOrganizationMember(
  organizationId: string,
  input: { email: string; role: OrganizationMember['role'] },
) {
  return apiRequest<OrganizationInvitation>(
    `/api/v1/organizations/${organizationId}/invitations`,
    { method: 'POST', body: JSON.stringify(input) },
  ).then((response) => response.data)
}

export function updateOrganizationMember(
  organizationId: string,
  membershipId: string,
  input: Partial<Pick<OrganizationMember, 'role' | 'status'>>,
) {
  return apiRequest<OrganizationMember>(
    `/api/v1/organizations/${organizationId}/members/${membershipId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  ).then((response) => response.data)
}

export function removeOrganizationMember(
  organizationId: string,
  membershipId: string,
) {
  return apiRequest<{ message: string }>(
    `/api/v1/organizations/${organizationId}/members/${membershipId}`,
    { method: 'DELETE' },
  )
}
