import type { OrganizationInput } from './organizations.ts'

function nullableValue(data: FormData, field: string) {
  const value = String(data.get(field) ?? '').trim()
  return value || null
}

export function organizationInput(data: FormData): OrganizationInput {
  return {
    name: String(data.get('name') ?? '').trim(),
    legal_name: nullableValue(data, 'legal_name'),
    description: nullableValue(data, 'description'),
    website_url: nullableValue(data, 'website_url'),
  }
}
