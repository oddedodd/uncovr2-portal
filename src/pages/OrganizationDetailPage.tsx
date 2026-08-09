import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Form, Link, useLocation, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { ImageUploadField } from '../components/ImageUploadField.tsx'
import { OrganizationFormFields } from '../components/OrganizationFormFields.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { organizationInput } from '../lib/organizationForm.ts'
import {
  getOrganization,
  inviteOrganizationAdministrator,
  organizationKeys,
  updateOrganization,
  updateOrganizationStatus,
  uploadOrganizationLogo,
  type Organization,
} from '../lib/organizations.ts'
import { platformKeys } from '../lib/platform.ts'

function StatusConfirmation({
  organization,
  pending,
  onCancel,
  onConfirm,
}: {
  organization: Organization
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const suspending = organization.status === 'active'

  return (
    <section
      className={`confirmation-panel${suspending ? ' confirmation-panel--danger' : ''}`}
      aria-labelledby="status-confirmation-heading"
    >
      <div>
        <h2 id="status-confirmation-heading">
          {suspending ? 'Suspender labelen?' : 'Godkjenn og aktiver labelen?'}
        </h2>
        <p>
          {suspending
            ? 'Medlemmer mister tilgangen umiddelbart. Statusendringen registreres i Laravels sikkerhetslogg.'
            : 'Medlemmer med aktive roller får tilgang igjen. Statusendringen registreres i Laravels sikkerhetslogg.'}
        </p>
      </div>
      <div className="confirmation-panel__actions">
        <button
          className="button button--secondary"
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          Avbryt
        </button>
        <button
          className={
            suspending ? 'button button--danger' : 'button button--primary'
          }
          disabled={pending}
          onClick={onConfirm}
          type="button"
        >
          {pending
            ? 'Oppdaterer …'
            : suspending
              ? 'Bekreft suspendering'
              : 'Godkjenn og aktiver'}
        </button>
      </div>
    </section>
  )
}

export function OrganizationDetailPage() {
  const { organizationId = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [confirmingStatus, setConfirmingStatus] = useState(false)
  const organization = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => getOrganization(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
  })
  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateOrganization>[1]) =>
      updateOrganization(organizationId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(organizationKeys.detail(organizationId), updated)
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all })
    },
  })
  const status = useMutation({
    mutationFn: (nextStatus: Organization['status']) =>
      updateOrganizationStatus(organizationId, nextStatus),
    onSuccess: async (updated) => {
      queryClient.setQueryData(organizationKeys.detail(organizationId), updated)
      setConfirmingStatus(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
        queryClient.invalidateQueries({ queryKey: platformKeys.overview }),
      ])
    },
  })
  const invitation = useMutation({
    mutationFn: (email: string) =>
      inviteOrganizationAdministrator(organizationId, email),
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update.mutate(organizationInput(new FormData(event.currentTarget)))
  }

  function handleInvitationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    invitation.mutate(String(data.get('email') ?? '').trim())
  }

  async function attachLogo(logoMediaId: string | null) {
    await update.mutateAsync({ logo_media_id: logoMediaId })
  }

  async function uploadLogo(file: File) {
    const updated = await uploadOrganizationLogo(organizationId, file)
    queryClient.setQueryData(organizationKeys.detail(organizationId), updated)
    await queryClient.invalidateQueries({ queryKey: organizationKeys.all })
  }

  if (organization.isPending) {
    return <p aria-live="polite">Henter label …</p>
  }

  if (organization.isError || !organization.data) {
    return (
      <FeedbackBanner title="Kunne ikke hente labelen" tone="error">
        <p>{formError(organization.error)}</p>
        <Link to="/labels">Tilbake til labels</Link>
      </FeedbackBanner>
    )
  }

  const current = organization.data

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">Superadmin · Labels</p>
        <div className="resource-title-row">
          <div>
            <h1 className="page-title">{current.profile.name}</h1>
            <p className="page-intro">
              Korriger profilinformasjon eller administrer labelens tilgang.
            </p>
          </div>
          <span className={`status-pill status-pill--${current.status}`}>
            {current.status === 'active' ? 'Aktiv' : 'Suspendert'}
          </span>
        </div>
      </div>

      {(location.state as { created?: boolean } | null)?.created ? (
        <FeedbackBanner title="Labelen er opprettet" tone="success">
          Den er aktiv, og invitasjonen til den første Label Admin er sendt til{' '}
          {(location.state as { administratorEmail?: string })
            .administratorEmail ?? 'den oppgitte e-postadressen'}
          .
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
      {status.isError ? (
        <FeedbackBanner title="Kunne ikke endre labelstatus" tone="error">
          {formError(status.error)}
        </FeedbackBanner>
      ) : null}

      <section
        className="settings-card"
        aria-labelledby="label-profile-heading"
      >
        <div className="settings-card__heading">
          <h2 id="label-profile-heading">Labelprofil</h2>
          <p>Offentlig ID: {current.id}</p>
        </div>
        <ImageUploadField
          canManage
          description="Labelens logo vises i arbeidsområdet. Kvadratisk format fungerer best."
          label="Labellogo"
          media={current.profile.logo_media}
          ownerId={current.id}
          ownerType="organization"
          onAttach={attachLogo}
          onUpload={uploadLogo}
        />
        <Form className="form-stack" method="post" onSubmit={handleSubmit}>
          <OrganizationFormFields
            values={current.profile}
            errors={{
              name: fieldError(update.error, 'name'),
              legal_name: fieldError(update.error, 'legal_name'),
              description: fieldError(update.error, 'description'),
              website_url: fieldError(update.error, 'website_url'),
            }}
          />
          <SubmitButton pending={update.isPending} pendingLabel="Lagrer …">
            Lagre korrigeringer
          </SubmitButton>
        </Form>
      </section>

      <section className="settings-card" aria-labelledby="first-admin-heading">
        <div className="settings-card__heading">
          <h2 id="first-admin-heading">Inviter flere labeladministratorer</h2>
          <p>
            Mottakeren får en tidsbegrenset e-postlenke og blir Label Admin når
            invitasjonen godtas.
          </p>
        </div>
        {invitation.isSuccess ? (
          <FeedbackBanner title="Invitasjonen er sendt" tone="success">
            {invitation.data.email} kan godta invitasjonen frem til{' '}
            {new Intl.DateTimeFormat('nb-NO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(invitation.data.expires_at))}
            .
          </FeedbackBanner>
        ) : null}
        {invitation.isError ? (
          <FeedbackBanner title="Kunne ikke sende invitasjonen" tone="error">
            {formError(invitation.error)}
          </FeedbackBanner>
        ) : null}
        <Form
          className="form-stack"
          method="post"
          onSubmit={handleInvitationSubmit}
        >
          <div className="form-field">
            <label htmlFor="administrator-email">Administratorens e-post</label>
            <input
              autoComplete="email"
              id="administrator-email"
              name="email"
              required
              type="email"
            />
          </div>
          <button
            className="button button--primary"
            disabled={invitation.isPending}
            type="submit"
          >
            {invitation.isPending
              ? 'Sender invitasjon …'
              : 'Inviter som Label Admin'}
          </button>
        </Form>
      </section>

      <section
        className={`settings-card${current.status === 'active' ? ' settings-card--danger' : ''}`}
        aria-labelledby="label-status-heading"
      >
        <div className="settings-card__heading settings-card__heading--row">
          <div>
            <h2 id="label-status-heading">Tilgangsstatus</h2>
            <p>
              {current.status === 'active'
                ? 'Suspender labelen hvis tilgangen må stoppes umiddelbart.'
                : 'Godkjenn og aktiver labelen når tilgangen kan gjenåpnes.'}
            </p>
          </div>
          {!confirmingStatus ? (
            <button
              className={
                current.status === 'active'
                  ? 'button button--danger-quiet'
                  : 'button button--primary'
              }
              onClick={() => setConfirmingStatus(true)}
              type="button"
            >
              {current.status === 'active'
                ? 'Suspender label'
                : 'Godkjenn og aktiver'}
            </button>
          ) : null}
        </div>
        {confirmingStatus ? (
          <StatusConfirmation
            organization={current}
            pending={status.isPending}
            onCancel={() => setConfirmingStatus(false)}
            onConfirm={() =>
              status.mutate(
                current.status === 'active' ? 'suspended' : 'active',
              )
            }
          />
        ) : null}
      </section>

      <Link className="resource-back-link" to="/labels">
        Tilbake til alle labels
      </Link>
    </div>
  )
}
