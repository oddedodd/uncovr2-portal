import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, useNavigate, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import {
  authKeys,
  getSessions,
  logout,
  logoutAll,
  revokeSession,
  updateCurrentUser,
  type DeviceSession,
} from '../lib/auth.ts'
import { roleLabel, type PortalOutletContext } from '../lib/portal.ts'

export function AccountPage() {
  const { user } = useOutletContext<PortalOutletContext>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const sessions = useQuery({
    queryKey: authKeys.sessions,
    queryFn: getSessions,
    retry: false,
  })
  const profile = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.currentUser, updatedUser)
    },
  })
  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: async (_, sessionId) => {
      const revokedCurrent = sessions.data?.some(
        (session) => session.id === sessionId && session.current,
      )
      if (revokedCurrent) {
        queryClient.clear()
        navigate('/session-expired', { replace: true })
        return
      }
      await queryClient.invalidateQueries({ queryKey: authKeys.sessions })
    },
  })
  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
  const signOutAll = useMutation({
    mutationFn: logoutAll,
    onSettled: () => {
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    profile.mutate(String(data.get('display_name') ?? ''))
  }

  return (
    <div className="account-page">
      <div>
        <p className="eyebrow">Konto</p>
        <h1 className="page-title">Profil og sikkerhet</h1>
        <p className="page-intro">
          Administrer navnet ditt og enhetene som har tilgang til Uncovr.
        </p>
      </div>

      <section className="settings-card" aria-labelledby="profile-heading">
        <div className="settings-card__heading">
          <h2 id="profile-heading">Profil</h2>
          <p>{user.email}</p>
        </div>
        {profile.isSuccess ? (
          <FeedbackBanner title="Profilen er lagret" tone="success" />
        ) : null}
        {profile.isError ? (
          <FeedbackBanner title="Kunne ikke lagre profilen" tone="error">
            {formError(profile.error)}
          </FeedbackBanner>
        ) : null}
        <Form
          className="form-stack"
          method="post"
          onSubmit={handleProfileSubmit}
        >
          <FormField
            autoComplete="name"
            defaultValue={user.profile.display_name ?? ''}
            error={fieldError(profile.error, 'display_name')}
            label="Visningsnavn"
            name="display_name"
            required
          />
          <SubmitButton pending={profile.isPending} pendingLabel="Lagrer …">
            Lagre profil
          </SubmitButton>
        </Form>
      </section>

      <section className="settings-card" aria-labelledby="workspaces-heading">
        <div className="settings-card__heading">
          <h2 id="workspaces-heading">Arbeidsområder</h2>
          <p>Aktive og suspenderte roller knyttet til kontoen.</p>
        </div>
        {user.workspaces.length === 0 ? (
          <div className="inline-empty">Du har ingen arbeidsområder ennå.</div>
        ) : (
          <ul className="workspace-list">
            {user.workspaces.map((workspace) => (
              <li key={`${workspace.type}:${workspace.id}`}>
                <div>
                  <strong>{workspace.name}</strong>
                  <span>{roleLabel(workspace.role)}</span>
                </div>
                <span
                  className={`status-pill status-pill--${workspace.status}`}
                >
                  {workspace.status === 'active' ? 'Aktiv' : 'Suspendert'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="settings-card" aria-labelledby="sessions-heading">
        <div className="settings-card__heading settings-card__heading--row">
          <div>
            <h2 id="sessions-heading">Innloggede enheter</h2>
            <p>Tilbakekall en økt du ikke kjenner igjen.</p>
          </div>
          <button
            className="button button--danger-quiet"
            disabled={signOutAll.isPending}
            onClick={() => signOutAll.mutate()}
            type="button"
          >
            Logg ut alle
          </button>
        </div>
        {sessions.isPending ? <p aria-live="polite">Laster enheter …</p> : null}
        {sessions.isError ? (
          <FeedbackBanner title="Kunne ikke laste enhetene" tone="error">
            <p>{formError(sessions.error)}</p>
            <button
              className="button button--secondary"
              onClick={() => sessions.refetch()}
            >
              Prøv igjen
            </button>
          </FeedbackBanner>
        ) : null}
        {sessions.data?.length === 0 ? (
          <div className="inline-empty">Ingen aktive enheter ble funnet.</div>
        ) : null}
        {sessions.data && sessions.data.length > 0 ? (
          <ul className="session-list">
            {sessions.data.map((session) => (
              <SessionRow
                key={session.id}
                pending={revoke.isPending && revoke.variables === session.id}
                session={session}
                onRevoke={() => revoke.mutate(session.id)}
              />
            ))}
          </ul>
        ) : null}
      </section>

      <section
        className="settings-card settings-card--danger"
        aria-labelledby="logout-heading"
      >
        <div className="settings-card__heading settings-card__heading--row">
          <div>
            <h2 id="logout-heading">Logg ut</h2>
            <p>Avslutt bare økten på denne enheten.</p>
          </div>
          <button
            className="button button--danger"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
            type="button"
          >
            {signOut.isPending ? 'Logger ut …' : 'Logg ut'}
          </button>
        </div>
      </section>
    </div>
  )
}

function SessionRow({
  session,
  pending,
  onRevoke,
}: {
  session: DeviceSession
  pending: boolean
  onRevoke: () => void
}) {
  return (
    <li>
      <div className="session-icon" aria-hidden="true">
        {session.client_type === 'portal' ? 'W' : 'M'}
      </div>
      <div className="session-details">
        <strong>
          {session.device_name}{' '}
          {session.current ? <em>Denne enheten</em> : null}
        </strong>
        <span>
          Sist brukt {formatDate(session.last_used_at)}
          {session.last_ip_address ? ` · ${session.last_ip_address}` : ''}
        </span>
      </div>
      <button
        className="button button--secondary button--small"
        disabled={pending}
        onClick={onRevoke}
        type="button"
      >
        {pending
          ? 'Tilbakekaller …'
          : session.current
            ? 'Logg ut'
            : 'Tilbakekall'}
      </button>
    </li>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
