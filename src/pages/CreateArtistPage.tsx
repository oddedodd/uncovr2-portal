import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Link, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { artistKeys, onboardArtist } from '../lib/artists.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { ForbiddenPage } from './states/ForbiddenPage.tsx'

function optionalString(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? '').trim()
  return value || null
}

export function CreateArtistPage() {
  const { workspace } = useOutletContext<PortalOutletContext>()
  const queryClient = useQueryClient()
  const organizationId = workspace?.type === 'organization' ? workspace.id : ''
  const create = useMutation({
    mutationFn: (input: Parameters<typeof onboardArtist>[1]) =>
      onboardArtist(organizationId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: artistKeys.all })
    },
  })

  if (
    !workspace ||
    workspace.type !== 'organization' ||
    workspace.role !== 'label_admin'
  ) {
    return <ForbiddenPage />
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate({
      artist: {
        name: String(data.get('name') ?? '').trim(),
        biography: optionalString(data, 'biography'),
        website_url: optionalString(data, 'website_url'),
      },
      administrator: {
        email: String(data.get('administrator_email') ?? '').trim(),
      },
      relationship_type: String(
        data.get('relationship_type') ?? 'managing_label',
      ) as 'managing_label' | 'distributor',
      creator_role: null,
      confirmation: true,
    })
  }

  if (create.data) {
    return (
      <section className="invitation-page">
        <p className="eyebrow">{workspace.name}</p>
        <h1 className="page-title">Artisten er opprettet</h1>
        <FeedbackBanner title={create.data.artist.profile.name} tone="success">
          Invitasjonen til Artist Admin er sendt til{' '}
          {create.data.administrator_invitation.email}. Den som opprettet
          artisten fikk ikke automatisk artisttilgang.
        </FeedbackBanner>
        <div className="invitation-actions">
          <Link className="button button--primary" to="/artists">
            Gå til artistlisten
          </Link>
          <button
            className="button button--secondary"
            onClick={() => create.reset()}
            type="button"
          >
            Opprett en artist til
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">{workspace.name}</p>
        <h1 className="page-title">Opprett artist</h1>
        <p className="page-intro">
          Artist, labeltilknytning og første Artist Admin-invitasjon opprettes i
          én transaksjon.
        </p>
      </div>

      {create.isError ? (
        <FeedbackBanner title="Kunne ikke opprette artisten" tone="error">
          {formError(create.error)}
        </FeedbackBanner>
      ) : null}

      <Form
        className="settings-card form-stack"
        method="post"
        onSubmit={handleSubmit}
      >
        <FormField
          error={fieldError(create.error, 'artist.name')}
          label="Artistnavn"
          maxLength={150}
          minLength={2}
          name="name"
          required
        />
        <div className="form-field">
          <label htmlFor="artist-biography">Biografi</label>
          <textarea
            aria-describedby={
              fieldError(create.error, 'artist.biography')
                ? 'artist-biography-error'
                : undefined
            }
            aria-invalid={
              fieldError(create.error, 'artist.biography') ? true : undefined
            }
            id="artist-biography"
            maxLength={5000}
            name="biography"
            rows={6}
          />
          {fieldError(create.error, 'artist.biography') ? (
            <span
              className="field-error"
              id="artist-biography-error"
              role="alert"
            >
              {fieldError(create.error, 'artist.biography')}
            </span>
          ) : null}
        </div>
        <FormField
          error={fieldError(create.error, 'artist.website_url')}
          label="Nettside"
          maxLength={2048}
          name="website_url"
          placeholder="https://"
          type="url"
        />
        <div className="form-field">
          <label htmlFor="artist-relationship">Labelens rolle</label>
          <select
            defaultValue="managing_label"
            id="artist-relationship"
            name="relationship_type"
          >
            <option value="managing_label">Managerlabel</option>
            <option value="distributor">Distributør</option>
          </select>
        </div>
        <div className="form-divider" aria-hidden="true" />
        <FormField
          autoComplete="email"
          error={fieldError(create.error, 'administrator.email')}
          hint="Personen får en tidsbegrenset invitasjon på e-post."
          label="E-post til første Artist Admin"
          name="administrator_email"
          required
          type="email"
        />
        <label className="checkbox-field">
          <input name="confirmation" required type="checkbox" />
          <span>
            Jeg bekrefter at artisten skal opprettes og at denne personen skal
            inviteres som Artist Admin.
          </span>
        </label>
        <div className="resource-form-actions">
          <Link className="button button--secondary" to="/artists">
            Avbryt
          </Link>
          <SubmitButton pending={create.isPending} pendingLabel="Oppretter …">
            Opprett artist og inviter admin
          </SubmitButton>
        </div>
      </Form>
    </div>
  )
}
