import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { type Organization } from '../lib/organizations.ts'
import { organizationListQueryOptions } from '../lib/queryOptions.ts'

type CursorState = { after?: string; before?: string }

function OrganizationRow({ organization }: { organization: Organization }) {
  return (
    <li>
      <div>
        <Link to={`/labels/${organization.id}`}>
          {organization.profile.name}
        </Link>
        <span>{organization.profile.legal_name ?? organization.id}</span>
      </div>
      <span className={`status-pill status-pill--${organization.status}`}>
        {organization.status === 'active' ? 'Aktiv' : 'Suspendert'}
      </span>
    </li>
  )
}

export function OrganizationsPage() {
  const [cursor, setCursor] = useState<CursorState>({})
  const organizations = useQuery(organizationListQueryOptions(cursor))

  return (
    <>
      <p className="eyebrow">Superadmin</p>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Labels</h1>
          <p className="page-intro">
            Opprett, korriger, suspender og aktiver labels gjennom Laravel.
          </p>
        </div>
        <Link className="button button--primary" to="/labels/new">
          Opprett label
        </Link>
      </div>

      {organizations.isError ? (
        <FeedbackBanner title="Kunne ikke hente labels" tone="error">
          Prøv igjen. Tilgangen kontrolleres av Laravel for hvert kall.
        </FeedbackBanner>
      ) : null}

      <section
        className="resource-section"
        aria-labelledby="labels-list-heading"
      >
        <div className="section-heading section-heading--row">
          <h2 id="labels-list-heading">Alle labels</h2>
          <button
            className="button button--secondary button--small"
            disabled={organizations.isFetching}
            onClick={() => void organizations.refetch()}
            type="button"
          >
            {organizations.isFetching ? 'Oppdaterer …' : 'Oppdater'}
          </button>
        </div>

        {organizations.isPending ? (
          <p aria-live="polite">Henter labels …</p>
        ) : organizations.data?.data.length === 0 ? (
          <div className="inline-empty">Ingen labels er opprettet ennå.</div>
        ) : organizations.data ? (
          <ul className="resource-list">
            {organizations.data.data.map((organization) => (
              <OrganizationRow
                key={organization.id}
                organization={organization}
              />
            ))}
          </ul>
        ) : null}

        {organizations.data?.pagination.next_cursor ||
        organizations.data?.pagination.previous_cursor ? (
          <nav className="search-pagination" aria-label="Labelsider">
            <button
              className="button button--secondary button--small"
              disabled={!organizations.data.pagination.previous_cursor}
              onClick={() =>
                setCursor({
                  before:
                    organizations.data?.pagination.previous_cursor ?? undefined,
                })
              }
              type="button"
            >
              Forrige
            </button>
            <button
              className="button button--secondary button--small"
              disabled={!organizations.data.pagination.next_cursor}
              onClick={() =>
                setCursor({
                  after:
                    organizations.data?.pagination.next_cursor ?? undefined,
                })
              }
              type="button"
            >
              Neste
            </button>
          </nav>
        ) : null}
      </section>
    </>
  )
}
