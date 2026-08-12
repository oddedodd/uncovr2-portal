import { useQuery } from '@tanstack/react-query'
import { type ChangeEvent, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { MediaThumbnail } from '../components/MediaThumbnail.tsx'
import { formError } from '../features/auth/validation.ts'
import { getMediaDownloadUrls, mediaKeys } from '../lib/media.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import {
  getReleases,
  releaseKeys,
  type ReleaseListFilters,
  type ReleaseSummary,
} from '../lib/releases.ts'
import { WorkspaceSectionPage } from './WorkspaceSectionPage.tsx'

type CursorState = { after?: string; before?: string }
type OwnershipFilter = 'all' | 'current' | 'organization' | 'artist'
type AssignmentFilter = 'all' | 'assigned-to-me' | 'not-assigned-to-me'

const statusOptions = [
  { value: '', label: 'Alle statuser' },
  { value: 'draft', label: 'Utkast' },
  { value: 'review', label: 'Til vurdering' },
  { value: 'scheduled', label: 'Planlagt' },
  { value: 'published', label: 'Publisert' },
  { value: 'unpublished', label: 'Avpublisert' },
  { value: 'archived', label: 'Arkivert' },
]

const ownershipOptions: Array<{ value: OwnershipFilter; label: string }> = [
  { value: 'all', label: 'Alle eiere' },
  { value: 'current', label: 'Dette arbeidsområdet' },
  { value: 'organization', label: 'Label-eide' },
  { value: 'artist', label: 'Artist-eide' },
]

const assignmentOptions: Array<{ value: AssignmentFilter; label: string }> = [
  { value: 'all', label: 'Alle tildelinger' },
  { value: 'assigned-to-me', label: 'Tildelt meg' },
  { value: 'not-assigned-to-me', label: 'Ikke tildelt meg' },
]

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

function releaseMatchesAssignment(
  release: ReleaseSummary,
  filter: AssignmentFilter,
  userId: string,
) {
  const assignedToUser = release.editor_user_ids.includes(userId)
  if (filter === 'assigned-to-me') return assignedToUser
  if (filter === 'not-assigned-to-me') return !assignedToUser
  return true
}

export function ReleasesPage() {
  const { user, workspace } = useOutletContext<PortalOutletContext>()
  const [cursor, setCursor] = useState<CursorState>({})
  const [serverFilters, setServerFilters] = useState<ReleaseListFilters>({})
  const [ownership, setOwnership] = useState<OwnershipFilter>('all')
  const [assignment, setAssignment] = useState<AssignmentFilter>('all')
  const effectiveFilters = useMemo<ReleaseListFilters>(() => {
    if (workspace?.type === 'artist') {
      return { ...serverFilters, artist_id: workspace.id }
    }
    if (workspace?.type === 'organization') {
      return {
        ...serverFilters,
        owner_id: workspace.id,
        owner_type: 'organization',
      }
    }
    return serverFilters
  }, [serverFilters, workspace])
  const releases = useQuery({
    queryKey: releaseKeys.list(cursor, effectiveFilters),
    queryFn: () => getReleases(cursor, effectiveFilters),
    enabled: Boolean(workspace),
    retry: false,
  })
  const visibleReleases = useMemo(
    () =>
      releases.data?.data.filter(
        (release) =>
          releaseMatchesOwnership(release, ownership, workspace) &&
          releaseMatchesAssignment(release, assignment, user.id),
      ) ?? [],
    [assignment, ownership, releases.data?.data, user.id, workspace],
  )
  const coverIds =
    visibleReleases
      .map((release) => release.cover_media?.id)
      .filter((id): id is string => Boolean(id)) ?? []
  const covers = useQuery({
    queryKey: mediaKeys.downloads(coverIds),
    queryFn: () => getMediaDownloadUrls(coverIds),
    enabled: coverIds.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

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
              value={assignment}
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
          <div className="inline-empty">
            Ingen utgivelser er opprettet ennå.
          </div>
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
                  url={covers.data?.get(release.cover_media?.id ?? '')}
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
                  {release.status}
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
