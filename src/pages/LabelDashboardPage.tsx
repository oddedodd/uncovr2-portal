import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Link } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { ImageUploadField } from '../components/ImageUploadField.tsx'
import { OrganizationFormFields } from '../components/OrganizationFormFields.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { organizationInput } from '../lib/organizationForm.ts'
import {
  getOrganization,
  organizationKeys,
  updateOrganization,
  uploadOrganizationLogo,
} from '../lib/organizations.ts'
import type { Workspace } from '../lib/auth.ts'
import { roleLabel } from '../lib/portal.ts'

export function LabelDashboardPage({ workspace }: { workspace: Workspace }) {
  const queryClient = useQueryClient()
  const organization = useQuery({
    queryKey: organizationKeys.detail(workspace.id),
    queryFn: () => getOrganization(workspace.id),
    retry: false,
  })
  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateOrganization>[1]) =>
      updateOrganization(workspace.id, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(organizationKeys.detail(workspace.id), updated)
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all })
    },
  })
  const canManage = workspace.role === 'label_admin'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update.mutate(organizationInput(new FormData(event.currentTarget)))
  }

  async function attachLogo(logoMediaId: string | null) {
    await update.mutateAsync({ logo_media_id: logoMediaId })
  }

  async function uploadLogo(file: File) {
    const updated = await uploadOrganizationLogo(workspace.id, file)
    queryClient.setQueryData(organizationKeys.detail(workspace.id), updated)
    await queryClient.invalidateQueries({ queryKey: organizationKeys.all })
  }

  return (
    <div className="label-dashboard">
      <div>
        <p className="eyebrow">{roleLabel(workspace.role)}</p>
        <h1 className="page-title">{workspace.name}</h1>
        <p className="page-intro">
          Administrer labelprofil, artister, team og utgivelser fra ett
          arbeidsområde.
        </p>
      </div>

      <section className="status-grid" aria-label="Labelverktøy">
        <article className="status-card">
          <span className="status-kicker">Artister</span>
          <h2>Artistkatalog</h2>
          <p>
            <Link to="/artists">Se labelens artister</Link>
          </p>
        </article>
        <article className="status-card">
          <span className="status-kicker">Utgivelser</span>
          <h2>Produksjon</h2>
          <p>
            <Link to="/releases">Se alle tillatte utgivelser</Link>
          </p>
        </article>
        <article className="status-card">
          <span className="status-kicker">Team</span>
          <h2>{canManage ? 'Administrasjon' : 'Skrivebeskyttet'}</h2>
          <p>
            {canManage ? (
              <Link to="/team">Administrer labelteamet</Link>
            ) : (
              'Label Admin administrerer roller og medlemmer.'
            )}
          </p>
        </article>
      </section>

      {organization.isPending ? (
        <p aria-live="polite">Henter labelprofil …</p>
      ) : null}
      {organization.isError ? (
        <FeedbackBanner title="Kunne ikke hente labelprofilen" tone="error">
          {formError(organization.error)}
        </FeedbackBanner>
      ) : null}
      {update.isSuccess ? (
        <FeedbackBanner title="Labelprofilen er lagret" tone="success" />
      ) : null}
      {update.isError ? (
        <FeedbackBanner title="Kunne ikke lagre labelprofilen" tone="error">
          {formError(update.error)}
        </FeedbackBanner>
      ) : null}

      {organization.data ? (
        <section
          className="settings-card"
          aria-labelledby="workspace-profile-heading"
        >
          <div className="settings-card__heading">
            <h2 id="workspace-profile-heading">Labelprofil</h2>
            <p>
              {canManage
                ? 'Oppdater informasjonen som brukes i labelens arbeidsområde.'
                : 'Du kan se profilen, men bare Label Admin kan endre den.'}
            </p>
          </div>
          <ImageUploadField
            canManage={canManage}
            description="Labelens logo vises i arbeidsområdet. Kvadratisk format fungerer best."
            label="Labellogo"
            media={organization.data.profile.logo_media}
            ownerId={organization.data.id}
            ownerType="organization"
            onAttach={attachLogo}
            onUpload={uploadLogo}
          />
          {canManage ? (
            <Form className="form-stack" method="post" onSubmit={handleSubmit}>
              <OrganizationFormFields
                values={organization.data.profile}
                errors={{
                  name: fieldError(update.error, 'name'),
                  legal_name: fieldError(update.error, 'legal_name'),
                  description: fieldError(update.error, 'description'),
                  website_url: fieldError(update.error, 'website_url'),
                }}
              />
              <SubmitButton pending={update.isPending} pendingLabel="Lagrer …">
                Lagre labelprofil
              </SubmitButton>
            </Form>
          ) : (
            <dl className="profile-details">
              <div>
                <dt>Navn</dt>
                <dd>{organization.data.profile.name}</dd>
              </div>
              <div>
                <dt>Juridisk navn</dt>
                <dd>
                  {organization.data.profile.legal_name ?? 'Ikke registrert'}
                </dd>
              </div>
              <div>
                <dt>Nettside</dt>
                <dd>
                  {organization.data.profile.website_url ?? 'Ikke registrert'}
                </dd>
              </div>
            </dl>
          )}
        </section>
      ) : null}
    </div>
  )
}
