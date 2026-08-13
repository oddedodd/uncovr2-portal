import { apiRequest } from './api.ts'

export interface PlatformOverview {
  users: {
    total: number
    by_status: Record<string, number>
    superadmins: number
  }
  organizations: {
    total: number
    by_status: Record<string, number>
  }
  artists: {
    total: number
    by_status: Record<string, number>
  }
  releases: {
    total: number
    by_status: Record<string, number>
  }
}

export const platformKeys = {
  overview: ['platform', 'overview'] as const,
  health: (check: 'live' | 'ready') => ['platform', 'health', check] as const,
}

export async function getPlatformOverview(
  signal?: AbortSignal,
): Promise<PlatformOverview> {
  return apiRequest<PlatformOverview>('/api/v1/platform/overview', {
    signal,
  }).then((response) => response.data)
}

export function getHealthCheck(check: 'live' | 'ready', signal?: AbortSignal) {
  return apiRequest<{ status: 'ok' | 'ready' }>(`/api/v1/health/${check}`, {
    signal,
  }).then((response) => response.data)
}
