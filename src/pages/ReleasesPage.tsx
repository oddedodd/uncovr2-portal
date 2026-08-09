import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { MediaThumbnail } from '../components/MediaThumbnail.tsx'
import { formError } from '../features/auth/validation.ts'
import { getMediaDownloadUrls, mediaKeys } from '../lib/media.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { getReleases, releaseKeys } from '../lib/releases.ts'
import { WorkspaceSectionPage } from './WorkspaceSectionPage.tsx'

type CursorState = { after?: string; before?: string }

export function ReleasesPage() {
  const { workspace } = useOutletContext<PortalOutletContext>()
  const [cursor, setCursor] = useState<CursorState>({})
  const releases = useQuery({
    queryKey: releaseKeys.list(cursor.after, cursor.before),
    queryFn: () => getReleases(cursor),
    retry: false,
  })
  const coverIds =
    releases.data?.data
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

  return (
    <>
      <p className="eyebrow">{workspace.name}</p>
      <h1 className="page-title">Utgivelser</h1>
      <p className="page-intro">
        Alle utgivelser Laravel gir rollen din tilgang til, også på tvers av
        labelens artister.
      </p>
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
        {releases.isPending ? (
          <p aria-live="polite">Henter utgivelser …</p>
        ) : releases.data?.data.length === 0 ? (
          <div className="inline-empty">
            Ingen utgivelser er opprettet ennå.
          </div>
        ) : releases.data ? (
          <ul className="release-list">
            {releases.data.data.map((release) => (
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
