import { useQuery } from '@tanstack/react-query'
import { type ChangeEvent, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { MediaThumbnail } from '../components/MediaThumbnail.tsx'
import { formError } from '../features/auth/validation.ts'
import { useMediaUrls } from '../features/media/useMediaUrl.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import {
  releaseStatusLabel,
  type ReleaseListFilters,
  type ReleaseSummary,
} from '../lib/releases.ts'
import { WorkspaceSectionPage } from './WorkspaceSectionPage.tsx'
import { releaseListQueryOptions } from '../lib/queryOptions.ts'

type CursorState = { after?: string; before?: string }
type OwnershipFilter = 'all' | 'current' | 'organization' | 'artist'
type AssignmentFilter = 'all' | 'assigned-to-me'

const statusOptions = [
  { value: '', label: 'Alle statuser' },
  ...(
    [
      'draft',
      'review',
      'scheduled',
      'published',
      'unpublished',
      'archived',
    ] as const
  ).map((status) => ({ value: status, label: releaseStatusLabel(status) })),
]

const ownershipOptions: Array<{ value: OwnershipFilter; label: string }> = [
  { value: 'all', label: 'Alle eiere' },
  { value: 'current', label: 'Dette arbeidsområdet' },
  { value: 'organization', label: 'Label-eide' },
  { value: 'artist', label: 'Artist-eide' },
]

const assignmentOptions: Array<{ value: AssignmentFilter; label: string }> = [
  { value: 'all', label: 'Alle utgivelser' },
  { value: 'assigned-to-me', label: 'Mine utgivelser' },
]

/**
 * En artist_user ser alle artistens utkast, men kan bare redigere de tildelte.
 * «Mine utgivelser» er derfor standardvisningen der. En artist_admin som aldri
 * tildelte seg selv ville fått en tom liste, så admin-rollene starter på alle.
 */
function defaultAssignment(
  workspace: PortalOutletContext['workspace'],
): AssignmentFilter {
  return workspace?.role === 'artist_user' ? 'assigned-to-me' : 'all'
}

function releaseMatchesOwnership(
  release: ReleaseSummary,
  filter: OwnershipFilter,
  workspace: PortalOutletContext['workspace'],
) {
  if (filter === 'all') return true
  if (filter === 'current') {
    return (
      release.owner.type === workspace?.type &&
      release.owner.id === workspace.id
    )
  }
  return release.owner.type === filter
}

export function ReleasesPage() {
  const { workspace } = useOutletContext<PortalOutletContext>()
  const [cursor, setCursor] = useState<CursorState>({})
  const [serverFilters, setServerFilters] = useState<ReleaseListFilters>({})
  const [ownership, setOwnership] = useState<OwnershipFilter>('all')
  // Standardvalget avhenger av arbeidsområdet, som ikke er kjent ved første
  // render. `null` betyr «ikke valgt av brukeren ennå», så standarden kan
  // følge arbeidsområdet uten en effekt som overstyrer et aktivt valg.
  const [assignment, setAssignment] = useState<AssignmentFilter | null>(null)
  const activeAssignment = assignment ?? defaultAssignment(workspace)
  const assignedToMe = activeAssignment === 'assigned-to-me'
  const effectiveFilters = useMemo<ReleaseListFilters>(() => {
    const assigned = assignedToMe ? { assigned_to_me: true } : {}
    if (workspace?.type === 'artist') {
      return { ...serverFilters, ...assigned, artist_id: workspace.id }
    }
    if (workspace?.type === 'organization') {
      return {
        ...serverFilters,
        ...assigned,
        owner_id: workspace.id,
        owner_type: 'organization',
      }
    }
    return { ...serverFilters, ...assigned }
  }, [assignedToMe, serverFilters, workspace])
  const releases = useQuery({
    ...releaseListQueryOptions(cursor, effectiveFilters),
    enabled: Boolean(workspace),
  })
  const visibleReleases = useMemo(
    () =>
      releases.data?.data.filter((release) =>
        releaseMatchesOwnership(release, ownership, workspace),
      ) ?? [],
    [ownership, releases.data?.data, workspace],
  )
  // Utledes fra serversvaret, ikke fra den klientfiltrerte lista: da endrer
  // ikke et filterbytte hvilke medier som er hentet.
  const covers = useMediaUrls(
    releases.data?.data.map((release) => release.cover_media?.id) ?? [],
  )

  if (!workspace) return <WorkspaceSectionPage />

  function updateStatus(event: ChangeEvent<HTMLSelectElement>) {
    const status = event.target.value
    setCursor({})
    setServerFilters((current) => ({ ...current, status: status || undefined }))
  }

  function updateOwnership(event: ChangeEvent<HTMLSelectElement>) {
    setCursor({})
    setOwnership(event.target.value as OwnershipFilter)
  }

  function updateAssignment(event: ChangeEvent<HTMLSelectElement>) {
    setCursor({})
    setAssignment(event.target.value as AssignmentFilter)
  }

  const emptyListMessage = assignedToMe
    ? 'Ingen utgivelser er tildelt deg ennå.'
    : 'Ingen utgivelser er opprettet ennå.'

  const canCreateRelease =
    (workspace.type === 'organization' && workspace.role === 'label_admin') ||
    (workspace.type === 'artist' && workspace.role === 'artist_admin')

  return (
    <>
      <p className="eyebrow">{workspace.name}</p>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Utgivelser</h1>
          <p className="page-intro">
            Utgivelser Laravel gir det aktive arbeidsområdet tilgang til.
          </p>
        </div>
        {canCreateRelease ? (
          <Link className="button button--primary" to="/releases/new">
            Opprett utgivelse
          </Link>
        ) : null}
      </div>
      {releases.isError ? (
        <FeedbackBanner title="Kunne ikke hente utgivelser" tone="error">
          {formError(releases.error)}
        </FeedbackBanner>
      ) : null}
      <section
        className="resource-section"
        aria-labelledby="release-list-heading"
      >
        <div className="section-heading section-heading--row">
          <h2 id="release-list-heading">Tilgjengelige utgivelser</h2>
          <button
            className="button button--secondary button--small"
            disabled={releases.isFetching}
            onClick={() => void releases.refetch()}
            type="button"
          >
            {releases.isFetching ? 'Oppdaterer …' : 'Oppdater'}
          </button>
        </div>
        <div className="release-filters" aria-label="Filtrer utgivelser">
          <div className="form-field">
            <label htmlFor="release-status-filter">Status</label>
            <select
              id="release-status-filter"
              onChange={updateStatus}
              value={serverFilters.status ?? ''}
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="release-ownership-filter">Eierskap</label>
            <select
              id="release-ownership-filter"
              onChange={updateOwnership}
              value={ownership}
            >
              {ownershipOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="release-assignment-filter">Tildeling</label>
            <select
              id="release-assignment-filter"
              onChange={updateAssignment}
              value={activeAssignment}
            >
              {assignmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {releases.isPending ? (
          <p aria-live="polite">Henter utgivelser …</p>
        ) : releases.data?.data.length === 0 ? (
          <div className="inline-empty">{emptyListMessage}</div>
        ) : visibleReleases.length === 0 ? (
          <div className="inline-empty">
            Ingen utgivelser matcher filtrene på denne siden.
          </div>
        ) : releases.data ? (
          <ul className="release-list">
            {visibleReleases.map((release) => (
              <li key={release.id}>
                <MediaThumbnail
                  alt={`Omslag for ${release.title}`}
                  url={covers.urls.get(release.cover_media?.id ?? '')}
                  variant="cover"
                />
                <div>
                  <Link
                    className="resource-link"
                    to={`/releases/${release.id}`}
                  >
                    <strong>{release.title}</strong>
                  </Link>
                  <span>
                    {release.artists.map((artist) => artist.name).join(', ') ||
                      'Ingen artist koblet til'}
                  </span>
                </div>
                <span className={`status-pill status-pill--${release.status}`}>
                  {releaseStatusLabel(release.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {releases.data?.pagination.next_cursor ||
        releases.data?.pagination.previous_cursor ? (
          <nav className="search-pagination" aria-label="Utgivelsessider">
            <button
              className="button button--secondary button--small"
              disabled={!releases.data.pagination.previous_cursor}
              onClick={() =>
                setCursor({
                  before:
                    releases.data?.pagination.previous_cursor ?? undefined,
                })
              }
              type="button"
            >
              Forrige
            </button>
            <button
              className="button button--secondary button--small"
              disabled={!releases.data.pagination.next_cursor}
              onClick={() =>
                setCursor({
                  after: releases.data?.pagination.next_cursor ?? undefined,
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
