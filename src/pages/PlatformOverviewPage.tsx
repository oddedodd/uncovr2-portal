import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import {
  getHealthCheck,
  getPlatformOverview,
  platformKeys,
} from '../lib/platform.ts'

function HealthCard({ check }: { check: 'live' | 'ready' }) {
  const query = useQuery({
    queryKey: platformKeys.health(check),
    queryFn: () => getHealthCheck(check),
    retry: false,
    refetchInterval: 60_000,
  })
  const ready = query.data?.status === (check === 'live' ? 'ok' : 'ready')

  return (
    <article className="operations-card">
      <div>
        <span className="status-kicker">
          {check === 'live' ? 'API-prosess' : 'Database'}
        </span>
        <h2>{check === 'live' ? 'Tilgjengelighet' : 'Klar for trafikk'}</h2>
      </div>
      <span
        className={`health-status ${ready ? 'health-status--ok' : query.isPending ? 'health-status--pending' : 'health-status--error'}`}
        role="status"
      >
        {ready
          ? 'Operativ'
          : query.isPending
            ? 'Kontrollerer …'
            : 'Krever tilsyn'}
      </span>
    </article>
  )
}

export function PlatformOverviewPage() {
  const overview = useQuery({
    queryKey: platformKeys.overview,
    queryFn: getPlatformOverview,
  })
  const summary = overview.data

  return (
    <>
      <p className="eyebrow">Superadmin</p>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Plattformoversikt</h1>
          <p className="page-intro">
            Status for labels, artister, utgivelser og de viktigste
            driftssignalene i Uncovr.
          </p>
        </div>
        <button
          className="button button--secondary"
          disabled={overview.isFetching}
          onClick={() => void overview.refetch()}
          type="button"
        >
          {overview.isFetching ? 'Oppdaterer …' : 'Oppdater oversikt'}
        </button>
      </div>

      {overview.isError ? (
        <FeedbackBanner title="Kunne ikke hente plattformstatus" tone="error">
          Prøv å oppdatere oversikten. Hvis feilen fortsetter, bruk
          forespørsels-ID-en fra API-et ved feilsøking.
        </FeedbackBanner>
      ) : null}

      <section className="metric-grid" aria-label="Plattformtall">
        <article className="metric-card">
          <span className="status-kicker">Labels</span>
          <strong>{summary?.organizations.total ?? '—'}</strong>
          <p>
            {summary
              ? `${summary.organizations.by_status.suspended ?? 0} suspendert`
              : 'Henter status …'}
          </p>
          <Link to="/labels">Se labels</Link>
        </article>
        <article className="metric-card">
          <span className="status-kicker">Artister</span>
          <strong>{summary?.artists.total ?? '—'}</strong>
          <p>
            {summary
              ? `${summary.artists.by_status.suspended ?? 0} suspendert`
              : 'Henter status …'}
          </p>
          <Link to="/artists">Se artister</Link>
        </article>
        <article className="metric-card">
          <span className="status-kicker">Utgivelser</span>
          <strong>{summary?.releases.total ?? '—'}</strong>
          <p>
            {summary
              ? `${summary.releases.by_status.submitted ?? 0} venter på vurdering`
              : 'Henter status …'}
          </p>
          <Link to="/releases">Se utgivelser</Link>
        </article>
        <article className="metric-card">
          <span className="status-kicker">Publisert</span>
          <strong>{summary?.releases.by_status.published ?? '—'}</strong>
          <p>Publiserte utgivelser på plattformen.</p>
          <Link to="/releases">Åpne utgivelseslisten</Link>
        </article>
      </section>

      <section
        className="operations-section"
        aria-labelledby="operations-title"
      >
        <div className="section-heading">
          <p className="eyebrow">Drift</p>
          <h2 id="operations-title">Operasjonell status</h2>
          <p>
            Signalene viser kun tilgjengelighet og databaseberedskap. Ingen
            sensitiv infrastrukturinformasjon eksponeres.
          </p>
        </div>
        <div className="operations-grid">
          <HealthCard check="live" />
          <HealthCard check="ready" />
        </div>
      </section>
    </>
  )
}
