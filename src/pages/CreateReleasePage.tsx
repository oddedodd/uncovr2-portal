import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Link, useNavigate, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'

import type { PortalOutletContext } from '../lib/portal.ts'
import { createRelease, releaseKeys } from '../lib/releases.ts'
import { ForbiddenPage } from './states/ForbiddenPage.tsx'
import { artistListQueryOptions } from '../lib/queryOptions.ts'

function optionalString(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? '').trim()
  return value || null
}

export function CreateReleasePage() {
  const { workspace } = useOutletContext<PortalOutletContext>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canCreate =
    workspace?.type === 'organization'
      ? workspace.role === 'label_admin'
      : workspace?.type === 'artist'
        ? workspace.role === 'artist_admin'
        : false
  const artists = useQuery({
    ...artistListQueryOptions(),
    enabled: workspace?.type === 'organization' && canCreate,
  })
  const create = useMutation({
    mutationFn: createRelease,
    onSuccess: async (release) => {
      queryClient.setQueryData(releaseKeys.detail(release.id), release)
      await queryClient.invalidateQueries({ queryKey: releaseKeys.lists() })
      navigate(`/releases/${release.id}`)
    },
  })

  if (!workspace || !canCreate) return <ForbiddenPage />

  const artistOptions =
    workspace.type === 'artist'
      ? [{ id: workspace.id, name: workspace.name }]
      : (artists.data?.data.map((artist) => ({
          id: artist.id,
          name: artist.profile.name,
        })) ?? [])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate({
      owner_type: workspace!.type as 'organization' | 'artist',
      owner_id: workspace!.id,
      primary_artist_id:
        workspace!.type === 'artist'
          ? workspace!.id
          : String(data.get('primary_artist_id') ?? ''),
      type: String(data.get('type') ?? 'single') as 'album' | 'ep' | 'single',
      title: String(data.get('title') ?? '').trim(),
      subtitle: optionalString(data, 'subtitle'),
      description: optionalString(data, 'description'),
      release_date: optionalString(data, 'release_date'),
      upc: optionalString(data, 'upc'),
      cover_media_id: null,
    })
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">{workspace.name}</p>
        <h1 className="page-title">Opprett utgivelse</h1>
        <p className="page-intro">
          Start med grunnleggende metadata. Omslag, spor og innhold legges på
          etter at utgivelsen er opprettet.
        </p>
      </div>

      {create.isError ? (
        <FeedbackBanner title="Kunne ikke opprette utgivelsen" tone="error">
          {formError(create.error)}
        </FeedbackBanner>
      ) : null}

      {artists.isError ? (
        <FeedbackBanner title="Kunne ikke hente artister" tone="error">
          {formError(artists.error)}
        </FeedbackBanner>
      ) : null}

      <Form
        className="settings-card form-stack"
        method="post"
        onSubmit={handleSubmit}
      >
        <div className="form-field">
          <label htmlFor="release-type">Type</label>
          <select defaultValue="single" id="release-type" name="type">
            <option value="single">Single</option>
            <option value="ep">EP</option>
            <option value="album">Album</option>
          </select>
        </div>
        {workspace.type === 'organization' ? (
          <div className="form-field">
            <label htmlFor="release-primary-artist">Primærartist</label>
            <select
              disabled={artists.isPending || artistOptions.length === 0}
              id="release-primary-artist"
              name="primary_artist_id"
              required
            >
              <option value="">
                {artists.isPending ? 'Henter artister …' : 'Velg artist'}
              </option>
              {artistOptions.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <FormField
          error={fieldError(create.error, 'title')}
          label="Tittel"
          maxLength={200}
          name="title"
          required
        />
        <FormField
          error={fieldError(create.error, 'subtitle')}
          label="Undertittel"
          maxLength={200}
          name="subtitle"
        />
        <div className="form-field">
          <label htmlFor="release-description">Beskrivelse</label>
          <textarea
            aria-describedby={
              fieldError(create.error, 'description')
                ? 'release-description-error'
                : undefined
            }
            aria-invalid={
              fieldError(create.error, 'description') ? true : undefined
            }
            id="release-description"
            maxLength={10000}
            name="description"
            rows={6}
          />
          {fieldError(create.error, 'description') ? (
            <span
              className="field-error"
              id="release-description-error"
              role="alert"
            >
              {fieldError(create.error, 'description')}
            </span>
          ) : null}
        </div>
        <FormField
          error={fieldError(create.error, 'release_date')}
          label="Utgivelsesdato"
          name="release_date"
          type="date"
        />
        <FormField
          error={fieldError(create.error, 'upc')}
          inputMode="numeric"
          label="UPC"
          maxLength={14}
          name="upc"
          pattern="[0-9]{12,14}"
        />
        <div className="resource-form-actions">
          <Link className="button button--secondary" to="/releases">
            Avbryt
          </Link>
          <SubmitButton
            disabled={
              workspace.type === 'organization' &&
              (artists.isPending || artistOptions.length === 0)
            }
            pending={create.isPending}
            pendingLabel="Oppretter …"
          >
            Opprett utgivelse
          </SubmitButton>
        </div>
      </Form>
    </div>
  )
}
