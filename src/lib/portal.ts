import type { CurrentUser, Workspace, WorkspaceRole } from './auth.ts'

export interface NavigationItem {
  label: string
  to: string
  roles?: WorkspaceRole[]
}

const workspaceNavigation: NavigationItem[] = [
  { label: 'Oversikt', to: '/' },
  { label: 'Søk', to: '/search', roles: ['superadmin'] },
  { label: 'Labels', to: '/labels', roles: ['superadmin'] },
  {
    label: 'Artister',
    to: '/artists',
    roles: ['superadmin', 'label_admin', 'label_user'],
  },
  {
    label: 'Utgivelser',
    to: '/releases',
    roles: [
      'superadmin',
      'label_admin',
      'label_user',
      'artist_admin',
      'artist_user',
    ],
  },
  { label: 'Team', to: '/team', roles: ['label_admin', 'artist_admin'] },
]

export interface PortalOutletContext {
  user: CurrentUser
  workspaces: Workspace[]
  workspacesError?: Error
  workspacesPending: boolean
  refetchWorkspaces: () => void
  workspace?: Workspace
}

export function navigationForRole(role?: WorkspaceRole) {
  return workspaceNavigation.filter(
    (item) => !item.roles || (role ? item.roles.includes(role) : false),
  )
}

export function roleLabel(role: WorkspaceRole) {
  return {
    superadmin: 'Superadmin',
    label_admin: 'Label Admin',
    label_user: 'Label User',
    artist_admin: 'Artist Admin',
    artist_user: 'Artist User',
  }[role]
}
