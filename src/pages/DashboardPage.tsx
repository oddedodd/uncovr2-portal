import { Link, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { roleLabel, type PortalOutletContext } from '../lib/portal.ts'
import { PlatformOverviewPage } from './PlatformOverviewPage.tsx'

export function DashboardPage() {
  const { user, workspace } = useOutletContext<PortalOutletContext>()

  if (!workspace) {
    const suspended = user.workspaces.filter(
      (candidate) => candidate.status === 'suspended',
    )

    return (
      <section className="empty-state">
        <p className="eyebrow">Ingen arbeidsområder</p>
        <h1>Du har ikke en aktiv portaltilgang ennå.</h1>
        <p>
          En administrator må invitere deg til en label eller artist før du kan
          arbeide i portalen.
        </p>
        {suspended.length > 0 ? (
          <FeedbackBanner title="Tilgang er satt på pause" tone="info">
            {suspended.map((candidate) => candidate.name).join(', ')} er synlig
            på kontoen, men kan ikke åpnes.
          </FeedbackBanner>
        ) : null}
        <Link className="button button--secondary" to="/account">
          Se kontoen din
        </Link>
      </section>
    )
  }

  if (workspace.type === 'platform' && workspace.role === 'superadmin') {
    return <PlatformOverviewPage />
  }

  return (
    <>
      <p className="eyebrow">{roleLabel(workspace.role)}</p>
      <h1 className="page-title">
        Hei, {user.profile.display_name ?? user.email}.
      </h1>
      <p className="page-intro">
        Du arbeider nå i <strong>{workspace.name}</strong>. Her samles oppgaver
        og snarveier som rollen din har tilgang til.
      </p>
      <section className="status-grid" aria-label="Arbeidsområdestatus">
        <article className="status-card">
          <span className="status-kicker">Arbeidsområde</span>
          <h2>{workspace.name}</h2>
          <p>
            {workspace.type === 'platform'
              ? 'Plattform'
              : workspace.type === 'organization'
                ? 'Label'
                : 'Artist'}
          </p>
        </article>
        <article className="status-card">
          <span className="status-kicker">Rolle</span>
          <h2>{roleLabel(workspace.role)}</h2>
          <p>Tilgangen vurderes på nytt av Laravel for hver handling.</p>
        </article>
        <article className="status-card">
          <span className="status-kicker">Konto</span>
          <h2>Aktiv økt</h2>
          <p>
            <Link to="/account">Se profil og innloggede enheter</Link>
          </p>
        </article>
      </section>
    </>
  )
}
