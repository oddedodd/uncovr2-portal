import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { MediaThumbnail } from '../components/MediaThumbnail.tsx'
import { formError } from '../features/auth/validation.ts'
import { useMediaUrls } from '../features/media/useMediaUrl.ts'
import { artistKeys, getArtists, type Artist } from '../lib/artists.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { WorkspaceSectionPage } from './WorkspaceSectionPage.tsx'

type CursorState = { after?: string; before?: string }

function ArtistRow({
  artist,
  imageUrl,
}: {
  artist: Artist
  imageUrl?: string
}) {
  return (
    <li>
      <MediaThumbnail alt={`Logo for ${artist.profile.name}`} url={imageUrl} />
      <div>
        <Link className="resource-link" to={`/artists/${artist.id}`}>
          <strong>{artist.profile.name}</strong>
        </Link>
        <span>{artist.profile.website_url ?? artist.id}</span>
      </div>
      <span className={`status-pill status-pill--${artist.status}`}>
        {artist.status === 'active' ? 'Aktiv' : 'Suspendert'}
      </span>
    </li>
  )
}

export function ArtistsPage() {
  const { workspace } = useOutletContext<PortalOutletContext>()
  const [cursor, setCursor] = useState<CursorState>({})
  const artists = useQuery({
    queryKey: artistKeys.list(cursor.after, cursor.before),
    queryFn: () => getArtists(cursor),
    retry: false,
  })
  const images = useMediaUrls(
    artists.data?.data.map(
      (artist) => (artist.profile.logo_media ?? artist.profile.image_media)?.id,
    ) ?? [],
  )

  if (!workspace) return <WorkspaceSectionPage />

  const canOnboard =
    workspace.type === 'organization' && workspace.role === 'label_admin'

  return (
    <>
      <p className="eyebrow">{workspace.name}</p>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Artister</h1>
          <p className="page-intro">
            Artister Laravel gir rollen din tilgang til. Nye artister opprettes
            sammen med den første Artist Admin-invitasjonen.
          </p>
        </div>
        {canOnboard ? (
          <Link className="button button--primary" to="/artists/new">
            Opprett artist
          </Link>
        ) : null}
      </div>

      {artists.isError ? (
        <FeedbackBanner title="Kunne ikke hente artister" tone="error">
          {formError(artists.error)}
        </FeedbackBanner>
      ) : null}

      <section
        className="resource-section"
        aria-labelledby="artists-list-heading"
      >
        <div className="section-heading section-heading--row">
          <h2 id="artists-list-heading">Tilgjengelige artister</h2>
          <button
            className="button button--secondary button--small"
            disabled={artists.isFetching}
            onClick={() => void artists.refetch()}
            type="button"
          >
            {artists.isFetching ? 'Oppdaterer …' : 'Oppdater'}
          </button>
        </div>

        {artists.isPending ? (
          <p aria-live="polite">Henter artister …</p>
        ) : artists.data?.data.length === 0 ? (
          <div className="inline-empty">Ingen artister er opprettet ennå.</div>
        ) : artists.data ? (
          <ul className="resource-list">
            {artists.data.data.map((artist) => (
              <ArtistRow
                artist={artist}
                imageUrl={images.urls.get(
                  (artist.profile.logo_media ?? artist.profile.image_media)
                    ?.id ?? '',
                )}
                key={artist.id}
              />
            ))}
          </ul>
        ) : null}

        {artists.data?.pagination.next_cursor ||
        artists.data?.pagination.previous_cursor ? (
          <nav className="search-pagination" aria-label="Artistsider">
            <button
              className="button button--secondary button--small"
              disabled={!artists.data.pagination.previous_cursor}
              onClick={() =>
                setCursor({
                  before: artists.data?.pagination.previous_cursor ?? undefined,
                })
              }
              type="button"
            >
              Forrige
            </button>
            <button
              className="button button--secondary button--small"
              disabled={!artists.data.pagination.next_cursor}
              onClick={() =>
                setCursor({
                  after: artists.data?.pagination.next_cursor ?? undefined,
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
