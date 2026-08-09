import { apiRequest, initializeCsrf, type ApiSuccess } from './api.ts'

export type WorkspaceType = 'platform' | 'organization' | 'artist'
export type WorkspaceRole =
  | 'superadmin'
  | 'label_admin'
  | 'label_user'
  | 'artist_admin'
  | 'artist_user'

export interface Workspace {
  id: string
  type: WorkspaceType
  name: string
  role: WorkspaceRole
  status: 'active' | 'suspended'
}

export interface CurrentUser {
  id: string
  email: string
  email_verified_at: string | null
  is_superadmin: boolean
  profile: {
    display_name: string | null
  }
}

export interface DeviceSession {
  id: string
  client_type: 'portal' | 'mobile'
  device_name: string
  platform: string | null
  app_version: string | null
  last_ip_address: string | null
  user_agent: string | null
  last_used_at: string
  idle_expires_at: string
  absolute_expires_at: string
  current: boolean
}

export interface LoginResponse {
  user: CurrentUser
  session: Omit<DeviceSession, 'current' | 'last_ip_address' | 'user_agent'>
  authentication: { type: 'session' }
}

export interface WorkspacesResponse {
  workspaces: Workspace[]
}

export interface RegisterInput {
  display_name: string
  email: string
  password: string
  password_confirmation: string
  consents: {
    terms: boolean
    privacy: boolean
    marketing_email: boolean
    marketing_push: boolean
  }
}

export const authKeys = {
  currentUser: ['auth', 'current-user'] as const,
  workspaces: ['auth', 'workspaces'] as const,
  sessions: ['auth', 'sessions'] as const,
}

function jsonRequest(body?: unknown): RequestInit {
  return {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

async function publicAuthRequest<T>(path: string, body: unknown) {
  await initializeCsrf()
  return apiRequest<T>(path, jsonRequest(body))
}

export async function login(email: string, password: string) {
  return publicAuthRequest<LoginResponse>('/api/v1/auth/login', {
    email,
    password,
    client_type: 'portal',
    device: {
      name: 'Uncovr adminportal',
      platform: navigator.platform || 'browser',
      app_version: null,
    },
  })
}

export function register(input: RegisterInput) {
  return publicAuthRequest<{ message: string }>('/api/v1/auth/register', input)
}

export function resendVerification(email: string) {
  return publicAuthRequest<{ message: string }>(
    '/api/v1/auth/resend-verification',
    { email },
  )
}

export function forgotPassword(email: string) {
  return publicAuthRequest<{ message: string }>(
    '/api/v1/auth/forgot-password',
    {
      email,
    },
  )
}

export function resetPassword(input: {
  email: string
  token: string
  password: string
  password_confirmation: string
}) {
  return publicAuthRequest<{ message: string }>(
    '/api/v1/auth/reset-password',
    input,
  )
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>('/api/v1/me').then((response) => response.data)
}

export function getCurrentWorkspaces() {
  return apiRequest<WorkspacesResponse>('/api/v1/me/workspaces').then(
    (response) => response.data.workspaces,
  )
}

export function updateCurrentUser(displayName: string) {
  return apiRequest<CurrentUser>('/api/v1/me', {
    method: 'PATCH',
    body: JSON.stringify({ display_name: displayName }),
  }).then((response) => response.data)
}

export function getSessions() {
  return apiRequest<{ sessions: DeviceSession[] }>('/api/v1/me/sessions').then(
    (response) => response.data.sessions,
  )
}

export function revokeSession(sessionId: string) {
  return apiRequest<{ message: string }>(`/api/v1/me/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export function logout() {
  return apiRequest<{ message: string }>('/api/v1/auth/logout', jsonRequest())
}

export function logoutAll() {
  return apiRequest<{ message: string }>(
    '/api/v1/auth/logout-all',
    jsonRequest(),
  )
}

export type AuthMessageResponse = ApiSuccess<{ message: string }>
