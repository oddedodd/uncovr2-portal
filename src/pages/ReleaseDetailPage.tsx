import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Link, useOutletContext, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { ImageUploadField } from '../components/ImageUploadField.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { artistKeys, getArtists } from '../lib/artists.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import {
  addReleaseArtist,
  getRelease,
  releaseKeys,
  removeReleaseArtist,
  updateRelease,
  updateReleaseCover,
  type ReleaseArtistInput,
  type ReleaseMetadataInput,
} from '../lib/releases.ts'

function optionalString(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? '').trim()
  return value || null
}

export function ReleaseDetailPage() {
  const { releaseId = '' } = useParams()
  const { user, workspace } = useOutletContext<PortalOutletContext>()
  const queryClient = useQueryClient()
  const release = useQuery({
    queryKey: releaseKeys.detail(releaseId),
    queryFn: () => getRelease(releaseId),
    enabled: Boolean(releaseId),
    retry: false,
  })
  const metadata = useMutation({
    mutationFn: (input: ReleaseMetadataInput) =>
      updateRelease(releaseId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(releaseKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: releaseKeys.all })
    },
  })
  const artists = useQuery({
    queryKey: artistKeys.list(),
    queryFn: () => getArtists(),
    enabled: Boolean(release.data) && Boolean(workspace),
    retry: false,
  })
  const addArtist = useMutation({
    mutationFn: (input: ReleaseArtistInput) =>
      addReleaseArtist(releaseId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
      ])
    },
  })
  const removeArtist = useMutation({
    mutationFn: (artistId: string) => removeReleaseArtist(releaseId, artistId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
      ])
    },
  })

  if (release.isPending) return <p aria-live="polite">Henter utgivelsen …</p>
  if (release.isError || !release.data || !workspace) {
    return (
      <FeedbackBanner title="Kunne ikke hente utgivelsen" tone="error">
        {formError(release.error)}
      </FeedbackBanner>
    )
  }

  const current = release.data
  const editableStatus = ['draft', 'unpublished'].includes(current.status)
  const manager = ['superadmin', 'label_admin', 'artist_admin'].includes(
    workspace.role,
  )
  const canManage =
    editableStatus && (manager || current.editor_user_ids.includes(user.id))

  async function attach(coverMediaId: string | null) {
    const updated = await updateReleaseCover(current.id, coverMediaId)
    queryClient.setQueryData(releaseKeys.detail(current.id), updated)
    await queryClient.invalidateQueries({ queryKey: releaseKeys.all })
  }

  function handleMetadataSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    metadata.mutate({
      type: String(data.get('type') ?? current.type) as
        | 'album'
        | 'ep'
        | 'single',
      title: String(data.get('title') ?? '').trim(),
      subtitle: optionalString(data, 'subtitle'),
      description: optionalString(data, 'description'),
      release_date: optionalString(data, 'release_date'),
      upc: optionalString(data, 'upc'),
    })
  }

  function handleArtistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    addArtist.mutate({
      artist_id: String(data.get('artist_id') ?? ''),
      is_primary: data.get('is_primary') === 'on',
      position: Number(data.get('position') ?? current.artists.length + 1),
    })
  }

  const linkedArtistIds = new Set(
    current.artists.map((artist) => artist.artist_id),
  )
  const availableArtists =
    artists.data?.data.filter((artist) => !linkedArtistIds.has(artist.id)) ?? []
  const nextPosition =
    Math.max(0, ...current.artists.map((artist) => artist.position)) + 1
  const sortedReleaseArtists = [...current.artists].sort(
    (first, second) => first.position - second.position,
  )

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">{workspace.name} · Utgivelse</p>
        <div className="resource-title-row">
          <div>
            <h1 className="page-title">{current.title}</h1>
            <p className="page-intro">
              {current.artists.map((artist) => artist.name).join(', ') ||
                'Ingen artist koblet til'}
            </p>
          </div>
          <span className={`status-pill status-pill--${current.status}`}>
            {current.status}
          </span>
        </div>
      </div>
      <section
        className="settings-card"
        aria-labelledby="release-cover-heading"
      >
        <div className="settings-card__heading">
          <h2 id="release-cover-heading">Albumomslag</h2>
          <p>
            {editableStatus
              ? 'Legg til eller bytt omslag før utgivelsen publiseres.'
              : 'Publiserte utgivelser må avpubliseres før omslaget kan endres.'}
          </p>
        </div>
        <ImageUploadField
          canManage={canManage}
          description="Et kvadratisk bilde i høy oppløsning anbefales. JPEG, PNG, WebP eller AVIF."
          label="Albumomslag"
          media={current.cover_media}
          ownerId={current.owner.id}
          ownerType={current.owner.type}
          variant="cover"
          onAttach={attach}
        />
      </section>
      <section
        className="settings-card"
        aria-labelledby="release-artists-heading"
      >
        <div className="settings-card__heading">
          <h2 id="release-artists-heading">Artister</h2>
          <p>
            {canManage
              ? 'Koble artister til utgivelsen og velg hvem som er primærartist.'
              : 'Artistlisten viser hvem som er koblet til utgivelsen.'}
          </p>
        </div>
        {addArtist.isError ? (
          <FeedbackBanner title="Kunne ikke legge til artist" tone="error">
            {formError(addArtist.error)}
          </FeedbackBanner>
        ) : null}
        {removeArtist.isError ? (
          <FeedbackBanner title="Kunne ikke fjerne artist" tone="error">
            {formError(removeArtist.error)}
          </FeedbackBanner>
        ) : null}
        <ul className="release-artist-list">
          {sortedReleaseArtists.map((artist) => (
            <li key={artist.artist_id}>
              <div>
                <strong>{artist.name}</strong>
                <span>
                  {artist.is_primary ? 'Primærartist' : 'Medvirkende artist'} ·
                  Posisjon {artist.position}
                </span>
              </div>
              {canManage && !artist.is_primary ? (
                <button
                  className="button button--secondary button--small"
                  disabled={removeArtist.isPending}
                  onClick={() => removeArtist.mutate(artist.artist_id)}
                  type="button"
                >
                  Fjern
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canManage ? (
          <Form
            className="release-artist-form"
            method="post"
            onSubmit={handleArtistSubmit}
          >
            <div className="form-field">
              <label htmlFor="release-artist">Legg til artist</label>
              <select
                disabled={artists.isPending || availableArtists.length === 0}
                id="release-artist"
                name="artist_id"
                required
              >
                <option value="">
                  {artists.isPending
                    ? 'Henter artister …'
                    : availableArtists.length === 0
                      ? 'Ingen flere artister tilgjengelig'
                      : 'Velg artist'}
                </option>
                {availableArtists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.profile.name}
                  </option>
                ))}
              </select>
              {fieldError(addArtist.error, 'artist_id') ? (
                <span className="field-error" role="alert">
                  {fieldError(addArtist.error, 'artist_id')}
                </span>
              ) : null}
            </div>
            <FormField
              defaultValue={nextPosition}
              error={fieldError(addArtist.error, 'position')}
              label="Posisjon"
              min={1}
              name="position"
              required
              type="number"
            />
            <label className="checkbox-field">
              <input name="is_primary" type="checkbox" />
              <span>Gjør til primærartist</span>
            </label>
            <div className="resource-form-actions">
              <SubmitButton
                disabled={artists.isPending || availableArtists.length === 0}
                pending={addArtist.isPending}
                pendingLabel="Legger til …"
              >
                Legg til artist
              </SubmitButton>
            </div>
          </Form>
        ) : null}
      </section>
      <section
        className="settings-card"
        aria-labelledby="release-details-heading"
      >
        <div className="settings-card__heading">
          <h2 id="release-details-heading">Utgivelsesinformasjon</h2>
          <p>
            {canManage
              ? 'Oppdater grunnleggende metadata mens utgivelsen er redigerbar.'
              : 'Grunnleggende metadata kan bare endres for redigerbare utgivelser du har tilgang til.'}
          </p>
        </div>
        {metadata.isError ? (
          <FeedbackBanner title="Kunne ikke lagre utgivelsen" tone="error">
            {formError(metadata.error)}
          </FeedbackBanner>
        ) : null}
        {metadata.isSuccess ? (
          <FeedbackBanner title="Utgivelsen er lagret" tone="success">
            Metadata ble oppdatert.
          </FeedbackBanner>
        ) : null}
        {canManage ? (
          <Form
            className="form-stack"
            method="post"
            onSubmit={handleMetadataSubmit}
          >
            <div className="form-field">
              <label htmlFor="release-type">Type</label>
              <select defaultValue={current.type} id="release-type" name="type">
                <option value="single">Single</option>
                <option value="ep">EP</option>
                <option value="album">Album</option>
              </select>
            </div>
            <FormField
              defaultValue={current.title}
              error={fieldError(metadata.error, 'title')}
              label="Tittel"
              maxLength={200}
              name="title"
              required
            />
            <FormField
              defaultValue={current.subtitle ?? ''}
              error={fieldError(metadata.error, 'subtitle')}
              label="Undertittel"
              maxLength={200}
              name="subtitle"
            />
            <div className="form-field">
              <label htmlFor="release-description">Beskrivelse</label>
              <textarea
                aria-describedby={
                  fieldError(metadata.error, 'description')
                    ? 'release-description-error'
                    : undefined
                }
                aria-invalid={
                  fieldError(metadata.error, 'description') ? true : undefined
                }
                defaultValue={current.description ?? ''}
                id="release-description"
                maxLength={10000}
                name="description"
                rows={6}
              />
              {fieldError(metadata.error, 'description') ? (
                <span
                  className="field-error"
                  id="release-description-error"
                  role="alert"
                >
                  {fieldError(metadata.error, 'description')}
                </span>
              ) : null}
            </div>
            <FormField
              defaultValue={current.release_date ?? ''}
              error={fieldError(metadata.error, 'release_date')}
              label="Utgivelsesdato"
              name="release_date"
              type="date"
            />
            <FormField
              defaultValue={current.upc ?? ''}
              error={fieldError(metadata.error, 'upc')}
              inputMode="numeric"
              label="UPC"
              maxLength={14}
              name="upc"
              pattern="[0-9]{12,14}"
            />
            <div className="resource-form-actions">
              <SubmitButton
                pending={metadata.isPending}
                pendingLabel="Lagrer …"
              >
                Lagre metadata
              </SubmitButton>
            </div>
          </Form>
        ) : (
          <dl className="profile-details">
            <div>
              <dt>Type</dt>
              <dd>{current.type}</dd>
            </div>
            <div>
              <dt>Utgivelsesdato</dt>
              <dd>{current.release_date ?? 'Ikke satt'}</dd>
            </div>
            <div>
              <dt>UPC</dt>
              <dd>{current.upc ?? 'Ikke satt'}</dd>
            </div>
            <div>
              <dt>Offentlig ID</dt>
              <dd>{current.id}</dd>
            </div>
          </dl>
        )}
      </section>
      <Link className="resource-back-link" to="/releases">
        Tilbake til alle utgivelser
      </Link>
    </div>
  )
}
