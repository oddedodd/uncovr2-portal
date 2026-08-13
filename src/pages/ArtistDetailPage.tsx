import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Link, useOutletContext, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { ImageUploadField } from '../components/ImageUploadField.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import {
  artistKeys,
  findCachedArtist,
  updateArtist,
  uploadArtistImage,
  uploadArtistLogo,
  type Artist,
} from '../lib/artists.ts'
import type { Workspace } from '../lib/auth.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { artistDetailQueryOptions } from '../lib/queryOptions.ts'

function ArtistProfile({
  artist,
  workspace,
}: {
  artist: Artist
  workspace: Workspace
}) {
  const queryClient = useQueryClient()
  const canEditText = [
    'superadmin',
    'label_admin',
    'artist_admin',
    'artist_user',
  ].includes(workspace.role)
  const canManageMedia = ['superadmin', 'label_admin', 'artist_admin'].includes(
    workspace.role,
  )
  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateArtist>[1]) =>
      updateArtist(artist.id, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(artistKeys.detail(artist.id), updated)
      await queryClient.invalidateQueries({ queryKey: artistKeys.lists() })
    },
  })

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    update.mutate({
      name: String(data.get('name') ?? '').trim(),
      biography: String(data.get('biography') ?? '').trim() || null,
      website_url: String(data.get('website_url') ?? '').trim() || null,
    })
  }

  async function attach(input: Parameters<typeof updateArtist>[1]) {
    await update.mutateAsync(input)
  }

  async function uploadLogo(file: File) {
    const updated = await uploadArtistLogo(artist.id, file)
    queryClient.setQueryData(artistKeys.detail(artist.id), updated)
    await queryClient.invalidateQueries({ queryKey: artistKeys.lists() })
  }

  async function uploadImage(file: File) {
    const updated = await uploadArtistImage(artist.id, file)
    queryClient.setQueryData(artistKeys.detail(artist.id), updated)
    await queryClient.invalidateQueries({ queryKey: artistKeys.lists() })
  }

  return (
    <>
      {update.isSuccess ? (
        <FeedbackBanner title="Artistprofilen er lagret" tone="success" />
      ) : null}
      {update.isError ? (
        <FeedbackBanner title="Kunne ikke lagre artistprofilen" tone="error">
          {formError(update.error)}
        </FeedbackBanner>
      ) : null}
      <section
        className="settings-card"
        aria-labelledby="artist-images-heading"
      >
        <div className="settings-card__heading">
          <h2 id="artist-images-heading">Bilder</h2>
          <p>
            Logoen brukes i kompakte visninger, mens artistbildet brukes som
            hovedbilde.
          </p>
        </div>
        <div className="image-field-grid">
          <ImageUploadField
            canManage={canManageMedia}
            description="Kvadratisk logo fungerer best. JPEG, PNG, WebP eller AVIF."
            label="Artistlogo"
            media={artist.profile.logo_media}
            ownerId={artist.id}
            ownerType="artist"
            onAttach={(logo_media_id) => attach({ logo_media_id })}
            onUpload={uploadLogo}
          />
          <ImageUploadField
            canManage={canManageMedia}
            description="Et liggende eller stående pressebilde av artisten."
            label="Artistbilde"
            media={artist.profile.image_media}
            ownerId={artist.id}
            ownerType="artist"
            variant="photo"
            onAttach={(image_media_id) => attach({ image_media_id })}
            onUpload={uploadImage}
          />
        </div>
      </section>
      <section
        className="settings-card"
        aria-labelledby="artist-profile-heading"
      >
        <div className="settings-card__heading">
          <h2 id="artist-profile-heading">Artistprofil</h2>
          <p>
            {canEditText
              ? 'Oppdater artistens grunninformasjon.'
              : 'Du har lesetilgang til profilen.'}
          </p>
        </div>
        {canEditText ? (
          <Form className="form-stack" method="post" onSubmit={submit}>
            <div className="form-field">
              <label htmlFor="artist-name">Artistnavn</label>
              <input
                defaultValue={artist.profile.name}
                id="artist-name"
                name="name"
                required
              />
              {fieldError(update.error, 'name') ? (
                <p className="field-error">
                  {fieldError(update.error, 'name')}
                </p>
              ) : null}
            </div>
            <div className="form-field">
              <label htmlFor="artist-biography">Biografi</label>
              <textarea
                defaultValue={artist.profile.biography ?? ''}
                id="artist-biography"
                name="biography"
                rows={6}
              />
            </div>
            <div className="form-field">
              <label htmlFor="artist-website">Nettside</label>
              <input
                defaultValue={artist.profile.website_url ?? ''}
                id="artist-website"
                name="website_url"
                type="url"
              />
            </div>
            <SubmitButton pending={update.isPending} pendingLabel="Lagrer …">
              Lagre artistprofil
            </SubmitButton>
          </Form>
        ) : (
          <p>{artist.profile.biography ?? 'Ingen biografi er lagt inn.'}</p>
        )}
      </section>
    </>
  )
}

export function ArtistDetailPage({
  artistId: providedId,
}: {
  artistId?: string
}) {
  const params = useParams()
  const queryClient = useQueryClient()
  const artistId = providedId ?? params.artistId ?? ''
  const { workspace } = useOutletContext<PortalOutletContext>()
  const artist = useQuery({
    ...artistDetailQueryOptions(artistId),
    enabled: Boolean(artistId),
    // Listeraden har samme form som detaljen, så navnet i toppen kan males
    // med én gang. Profilskjemaet er ukontrollert og venter på ekte data.
    placeholderData: () => findCachedArtist(queryClient, artistId),
  })

  if (!workspace) return null
  if (artist.isPending) return <p aria-live="polite">Henter artistprofil …</p>
  if (artist.isError || !artist.data) {
    return (
      <FeedbackBanner title="Kunne ikke hente artisten" tone="error">
        {formError(artist.error)}
      </FeedbackBanner>
    )
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">{workspace.name} · Artist</p>
        <h1 className="page-title">{artist.data.profile.name}</h1>
        <p className="page-intro">
          Administrer artistens profil og visuelle identitet.
        </p>
      </div>
      {artist.isPlaceholderData ? (
        <p aria-live="polite">Henter artistprofil …</p>
      ) : (
        <ArtistProfile artist={artist.data} workspace={workspace} />
      )}
      {providedId ? null : (
        <Link className="resource-back-link" to="/artists">
          Tilbake til alle artister
        </Link>
      )}
    </div>
  )
}
