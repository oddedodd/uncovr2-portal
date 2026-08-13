import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import {
  platformSearchKeys,
  platformSearchResources,
  searchPlatformResource,
  type CursorPagination,
  type PlatformSearchResource,
  type PlatformScopeResult,
  type PlatformUserResult,
  type PlatformReleaseResult,
  type SearchResultMap,
} from '../lib/platformSearch.ts'

type CursorState = { after?: string; before?: string }
type CursorsByResource = Partial<Record<PlatformSearchResource, CursorState>>

const sectionLabels: Record<PlatformSearchResource, string> = {
  users: 'Brukere',
  organizations: 'Labels',
  artists: 'Artister',
  releases: 'Utgivelser',
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active' || status === 'published'

  return (
    <span
      className={`result-status result-status--${active ? 'active' : 'muted'}`}
    >
      {status}
    </span>
  )
}

function UserResult({ result }: { result: PlatformUserResult }) {
  return (
    <article className="search-result-card">
      <div>
        <h3>
          <Link to={`/users/${result.id}`}>
            {result.display_name ?? result.email}
          </Link>
        </h3>
        <p>{result.email}</p>
      </div>
      <div className="search-result-card__meta">
        {result.is_superadmin ? <span>Superadmin</span> : null}
        <StatusBadge status={result.status} />
        <code>{result.id}</code>
      </div>
    </article>
  )
}

function ScopeResult({ result }: { result: PlatformScopeResult }) {
  return (
    <article className="search-result-card">
      <div>
        <h3>{result.profile.name}</h3>
        {result.profile.legal_name ? <p>{result.profile.legal_name}</p> : null}
      </div>
      <div className="search-result-card__meta">
        <StatusBadge status={result.status} />
        <code>{result.id}</code>
      </div>
    </article>
  )
}

function ReleaseResult({ result }: { result: PlatformReleaseResult }) {
  const artistNames = result.artists.map((artist) => artist.name).join(', ')

  return (
    <article className="search-result-card">
      <div>
        <h3>{result.title}</h3>
        <p>
          {[artistNames, result.type, result.release_date]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="search-result-card__meta">
        <StatusBadge status={result.status} />
        <code>{result.id}</code>
      </div>
    </article>
  )
}

function ResultItem({
  resource,
  result,
}: {
  resource: PlatformSearchResource
  result: SearchResultMap[PlatformSearchResource]
}) {
  if (resource === 'users') {
    return <UserResult result={result as PlatformUserResult} />
  }
  if (resource === 'releases') {
    return <ReleaseResult result={result as PlatformReleaseResult} />
  }
  return <ScopeResult result={result as PlatformScopeResult} />
}

function PaginationControls({
  pagination,
  onChange,
}: {
  pagination: CursorPagination
  onChange: (cursor: CursorState) => void
}) {
  if (!pagination.next_cursor && !pagination.previous_cursor) return null

  return (
    <nav className="search-pagination" aria-label="Resultatsider">
      <button
        className="button button--secondary button--small"
        disabled={!pagination.previous_cursor}
        onClick={() =>
          onChange({ before: pagination.previous_cursor ?? undefined })
        }
        type="button"
      >
        Forrige
      </button>
      <button
        className="button button--secondary button--small"
        disabled={!pagination.next_cursor}
        onClick={() => onChange({ after: pagination.next_cursor ?? undefined })}
        type="button"
      >
        Neste
      </button>
    </nav>
  )
}

function PlatformSearchContent({ urlQuery }: { urlQuery: string }) {
  const [, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState(urlQuery)
  const [cursors, setCursors] = useState<CursorsByResource>({})
  const normalizedQuery = urlQuery.trim()
  const canSearch = normalizedQuery.length >= 2

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = draft.trim()
      if (nextQuery === urlQuery) return

      setSearchParams(nextQuery ? { q: nextQuery } : {}, { replace: true })
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [draft, setSearchParams, urlQuery])

  const queries = useQueries({
    queries: platformSearchResources.map((resource) => ({
      queryKey: platformSearchKeys.result(
        resource,
        normalizedQuery,
        cursors[resource]?.after,
        cursors[resource]?.before,
      ),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        searchPlatformResource(
          resource,
          normalizedQuery,
          cursors[resource],
          signal,
        ),
      enabled: canSearch,
    })),
  })

  const totalResults = useMemo(
    () =>
      queries.reduce(
        (total, query) => total + (query.data?.data.length ?? 0),
        0,
      ),
    [queries],
  )
  const isSearching = canSearch && queries.some((query) => query.isPending)
  const hasError = queries.some((query) => query.isError)

  return (
    <>
      <p className="eyebrow">Superadmin</p>
      <h1 className="page-title">Søk i plattformen</h1>
      <p className="page-intro">
        Finn brukere, labels, artister og utgivelser. Resultatene avgrenses og
        autoriseres av Laravel.
      </p>

      <div className="platform-search">
        <label htmlFor="platform-search">Søk med navn, e-post eller ID</label>
        <input
          aria-describedby="platform-search-hint"
          autoComplete="off"
          id="platform-search"
          minLength={2}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Skriv minst to tegn"
          type="search"
          value={draft}
        />
        <p id="platform-search-hint">
          Søket starter automatisk og lagres i adressen, slik at resultatet kan
          deles eller åpnes igjen.
        </p>
      </div>

      {hasError ? (
        <FeedbackBanner title="Noen resultater kunne ikke hentes" tone="error">
          Prøv søket på nytt. Laravel kan ha avvist en eller flere
          resultatgrupper.
        </FeedbackBanner>
      ) : null}

      <p className="search-summary" aria-live="polite">
        {!normalizedQuery
          ? 'Skriv inn et søk for å begynne.'
          : !canSearch
            ? 'Skriv minst to tegn.'
            : isSearching
              ? 'Søker …'
              : `${totalResults} resultater på denne siden.`}
      </p>

      {canSearch ? (
        <div className="search-sections">
          {platformSearchResources.map((resource, index) => {
            const query = queries[index]
            const results = query.data?.data ?? []

            return (
              <section
                className="search-section"
                key={resource}
                aria-labelledby={`search-${resource}`}
              >
                <div className="search-section__heading">
                  <h2 id={`search-${resource}`}>{sectionLabels[resource]}</h2>
                  <span>{query.isPending ? '…' : results.length}</span>
                </div>
                {query.isPending ? (
                  <p className="search-section__state">Henter resultater …</p>
                ) : query.isError ? (
                  <p className="search-section__state">
                    Denne resultatgruppen er ikke tilgjengelig.
                  </p>
                ) : results.length === 0 ? (
                  <p className="search-section__state">Ingen treff.</p>
                ) : (
                  <div className="search-result-list">
                    {results.map((result) => (
                      <ResultItem
                        key={result.id}
                        resource={resource}
                        result={result}
                      />
                    ))}
                  </div>
                )}
                {query.data ? (
                  <PaginationControls
                    pagination={query.data.pagination}
                    onChange={(cursor) =>
                      setCursors((current) => ({
                        ...current,
                        [resource]: cursor,
                      }))
                    }
                  />
                ) : null}
              </section>
            )
          })}
        </div>
      ) : null}
    </>
  )
}

export function PlatformSearchPage() {
  const [searchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''

  return <PlatformSearchContent key={urlQuery} urlQuery={urlQuery} />
}
