import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Form, Link, useLocation, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { OrganizationFormFields } from '../components/OrganizationFormFields.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { organizationInput } from '../lib/organizationForm.ts'
import {
  getOrganization,
  organizationKeys,
  updateOrganization,
  updateOrganizationStatus,
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update.mutate(organizationInput(new FormData(event.currentTarget)))
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
          Den er aktiv og kan nå korrigeres eller suspenderes.
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
