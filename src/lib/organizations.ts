import { apiRequest } from './api.ts'
import type { CursorPagination } from './platformSearch.ts'
import type { MediaReference } from './media.ts'

export interface Organization {
  id: string
  status: 'active' | 'suspended'
  profile: {
    name: string
    legal_name: string | null
    description: string | null
    website_url: string | null
    logo_media_id: string | null
    logo_media: MediaReference | null
  }
  created_at: string
  updated_at: string
}

export interface OrganizationInput {
  name: string
  legal_name: string | null
  description: string | null
  website_url: string | null
}

export type OrganizationUpdateInput = Partial<
  OrganizationInput & { logo_media_id: string | null }
>

interface OrganizationPaginationMeta {
  pagination?: CursorPagination
}

export interface OrganizationPage {
  data: Organization[]
  pagination: CursorPagination
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: 'label_admin' | 'label_user'
  expires_at: string
  last_sent_at: string
  send_count: number
}

export interface OrganizationOnboardingInput {
  organization: OrganizationInput
  administrator: { email: string }
  confirmation: true
}

export interface OrganizationOnboardingResult {
  organization: Organization
  administrator_invitation: Pick<
    OrganizationInvitation,
    'id' | 'email' | 'role' | 'expires_at'
  >
}

/**
 * Som for utgivelser og artister: `all` er et prefiks av `list` og `detail`, så
 * den skal ikke brukes som invalideringsmål etter en skriving.
 */
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => ['organizations', 'list'] as const,
  list: (after?: string, before?: string) =>
    ['organizations', 'list', after, before] as const,
  details: () => ['organizations', 'detail'] as const,
  detail: (organizationId: string) =>
    ['organizations', 'detail', organizationId] as const,
}

export async function getOrganizations(
  cursor: { after?: string; before?: string } = {},
): Promise<OrganizationPage> {
  const params = new URLSearchParams({ 'page[size]': '25' })
  if (cursor.after) params.set('page[after]', cursor.after)
  if (cursor.before) params.set('page[before]', cursor.before)

  const response = await apiRequest<Organization[]>(
    `/api/v1/organizations?${params.toString()}`,
  )
  const meta = response.meta as OrganizationPaginationMeta | undefined

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

export function getOrganization(organizationId: string) {
  return apiRequest<Organization>(
    `/api/v1/organizations/${organizationId}`,
  ).then((response) => response.data)
}

export function createOrganization(input: OrganizationInput) {
  return apiRequest<Organization>('/api/v1/organizations', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function onboardOrganization(input: OrganizationOnboardingInput) {
  return apiRequest<OrganizationOnboardingResult>(
    '/api/v1/platform/organization-onboardings',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data)
}

export function updateOrganization(
  organizationId: string,
  input: OrganizationUpdateInput,
) {
  return apiRequest<Organization>(`/api/v1/organizations/${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((response) => response.data)
}

export function uploadOrganizationLogo(organizationId: string, file: File) {
  const formData = new FormData()
  formData.append('image', file)

  return apiRequest<Organization>(
    `/api/v1/organizations/${organizationId}/logo`,
    {
      method: 'POST',
      body: formData,
    },
  ).then((response) => response.data)
}

export function updateOrganizationStatus(
  organizationId: string,
  status: Organization['status'],
) {
  return apiRequest<Organization>(
    `/api/v1/organizations/${organizationId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  ).then((response) => response.data)
}

export function inviteOrganizationAdministrator(
  organizationId: string,
  email: string,
) {
  return apiRequest<OrganizationInvitation>(
    `/api/v1/organizations/${organizationId}/invitations`,
    {
      method: 'POST',
      body: JSON.stringify({ email, role: 'label_admin' }),
    },
  ).then((response) => response.data)
}

export function acceptOrganizationInvitation(token: string) {
  return apiRequest<{
    membership_id: string
    organization_id: string
    role: 'label_admin' | 'label_user'
  }>('/api/v1/organization-invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }).then((response) => response.data)
}
