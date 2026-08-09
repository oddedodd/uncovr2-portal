import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useCurrentUser } from '../features/auth/useCurrentUser.ts'
import { useWorkspaces } from '../features/auth/useWorkspaces.ts'
import type { Workspace } from '../lib/auth.ts'
import {
  navigationForRole,
  roleLabel,
  type PortalOutletContext,
} from '../lib/portal.ts'
import '../App.css'

const emptyWorkspaces: Workspace[] = []

export function PortalLayout() {
  const navigate = useNavigate()
  const userQuery = useCurrentUser()
  const workspacesQuery = useWorkspaces()
  const user = userQuery.data!
  const workspaces = Array.isArray(workspacesQuery.data)
    ? workspacesQuery.data
    : emptyWorkspaces
  const activeWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.status === 'active'),
    [workspaces],
  )
  const [workspaceId, setWorkspaceId] = useState(activeWorkspaces[0]?.id ?? '')
  const workspace =
    activeWorkspaces.find((candidate) => candidate.id === workspaceId) ??
    activeWorkspaces[0]
  const navigation = navigationForRole(workspace?.role)

  function handleWorkspaceChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setWorkspaceId(event.target.value)
    navigate('/')
  }

  return (
    <div className="portal">
      <a className="skip-link" href="#main-content">
        Hopp til hovedinnhold
      </a>
      <header className="portal-header">
        <NavLink className="brand" to="/" aria-label="Uncovr admin, forsiden">
          <img alt="" className="brand-logo" src="/uncovr-logo.png" />
        </NavLink>
        <div className="header-actions">
          <span className="environment-badge">
            {import.meta.env.DEV ? 'Lokal utvikling' : 'Produksjon'}
          </span>
          <NavLink className="account-link" to="/account">
            <span className="avatar" aria-hidden="true">
              {(user.profile.display_name ?? user.email)
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <span className="account-link__label">
              {user.profile.display_name ?? user.email}
            </span>
          </NavLink>
        </div>
      </header>
      <div className="portal-grid">
        <aside className="sidebar">
          <div className="workspace-picker">
            <label htmlFor="workspace">Arbeidsområde</label>
            {workspacesQuery.isPending ? (
              <p className="workspace-picker__empty" aria-live="polite">
                Laster arbeidsområder …
              </p>
            ) : workspacesQuery.isError ? (
              <button
                className="button button--secondary button--small"
                onClick={() => workspacesQuery.refetch()}
                type="button"
              >
                Prøv igjen
              </button>
            ) : activeWorkspaces.length > 0 ? (
              <select
                id="workspace"
                onChange={handleWorkspaceChange}
                value={workspace?.id}
              >
                {activeWorkspaces.map((candidate) => (
                  <option
                    key={`${candidate.type}:${candidate.id}`}
                    value={candidate.id}
                  >
                    {candidate.name} · {roleLabel(candidate.role)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="workspace-picker__empty">
                Ingen aktive arbeidsområder
              </p>
            )}
          </div>
          <nav aria-label="Hovednavigasjon">
            <ul className="nav-list">
              {navigation.map((item) => (
                <li key={item.to}>
                  <NavLink
                    className="nav-link"
                    to={item.to}
                    end={item.to === '/'}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <p className="authorization-note">
            Laravel kontrollerer tilgang på hvert kall. Menyvalg er kun en hjelp
            i grensesnittet.
          </p>
        </aside>
        <main className="portal-main" id="main-content" tabIndex={-1}>
          <Outlet
            context={
              {
                user,
                workspaces,
                workspacesError: workspacesQuery.error ?? undefined,
                workspacesPending: workspacesQuery.isPending,
                refetchWorkspaces: () => {
                  void workspacesQuery.refetch()
                },
                workspace,
              } satisfies PortalOutletContext
            }
          />
        </main>
      </div>
    </div>
  )
}
