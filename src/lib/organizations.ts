import { apiRequest } from './api.ts'
import type { CursorPagination } from './platformSearch.ts'

export interface Organization {
  id: string
  status: 'active' | 'suspended'
  profile: {
    name: string
    legal_name: string | null
    description: string | null
    website_url: string | null
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

interface OrganizationPaginationMeta {
  pagination?: CursorPagination
}

export interface OrganizationPage {
  data: Organization[]
  pagination: CursorPagination
}

export const organizationKeys = {
  all: ['organizations'] as const,
  list: (after?: string, before?: string) =>
    ['organizations', 'list', after, before] as const,
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

export function updateOrganization(
  organizationId: string,
  input: OrganizationInput,
) {
  return apiRequest<Organization>(`/api/v1/organizations/${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((response) => response.data)
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
