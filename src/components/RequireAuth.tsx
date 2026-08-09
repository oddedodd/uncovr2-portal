import { Navigate, Outlet, useLocation } from 'react-router'
import { ApiError } from '../lib/api.ts'
import { FeedbackBanner } from './FeedbackBanner.tsx'
import { useCurrentUser } from '../features/auth/useCurrentUser.ts'

export function RequireAuth() {
  const location = useLocation()
  const user = useCurrentUser()

  if (user.isPending) {
    return (
      <main className="centered-state" aria-busy="true">
        <span className="loading-indicator" aria-hidden="true" />
        <p>Kontrollerer innlogging …</p>
      </main>
    )
  }

  if (user.error instanceof ApiError && user.error.status === 401) {
    return (
      <Navigate
        to="/session-expired"
        replace
        state={{ returnTo: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (user.isError) {
    return (
      <main className="centered-state">
        <FeedbackBanner title="Kunne ikke åpne portalen" tone="error">
          <p>{user.error.message}</p>
          <button
            className="button button--secondary"
            onClick={() => user.refetch()}
          >
            Prøv igjen
          </button>
        </FeedbackBanner>
      </main>
    )
  }

  return <Outlet />
}
