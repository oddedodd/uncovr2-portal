import { Form } from 'react-router'
import { fieldError, formError } from '../features/auth/validation.ts'
import type {
  ArtistMembership,
  OrganizationMembership,
} from '../lib/platformUsers.ts'
import { roleLabel } from '../lib/portal.ts'
import { FeedbackBanner } from './FeedbackBanner.tsx'

export interface CorrectionTarget {
  type: 'organization' | 'artist'
  membershipId: string
  scopeName: string
  role: OrganizationMembership['role'] | ArtistMembership['role']
}

function AuditFields({
  userId,
  reasonError,
  confirmationError,
}: {
  userId: string
  reasonError?: string
  confirmationError?: string
}) {
  return (
    <>
      <div className="form-field">
        <label htmlFor="audit-reason">Begrunnelse</label>
        <span className="field-hint">
          Minst 10 tegn. Begrunnelsen lagres i sikkerhetsloggen.
        </span>
        <textarea
          aria-describedby={reasonError ? 'audit-reason-error' : undefined}
          aria-invalid={reasonError ? true : undefined}
          id="audit-reason"
          maxLength={500}
          minLength={10}
          name="reason"
          required
          rows={4}
        />
        {reasonError ? (
          <span className="field-error" id="audit-reason-error" role="alert">
            {reasonError}
          </span>
        ) : null}
      </div>
      <div className="form-field">
        <label htmlFor="audit-confirmation">Bekreft med bruker-ID</label>
        <span className="field-hint">
          Skriv <code>{userId}</code> nøyaktig.
        </span>
        <input
          aria-invalid={confirmationError ? true : undefined}
          id="audit-confirmation"
          name="confirmation"
          required
        />
        {confirmationError ? (
          <span className="field-error" role="alert">
            {confirmationError}
          </span>
        ) : null}
      </div>
    </>
  )
}

export function RoleCorrectionPanel({
  target,
  userId,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  target: CorrectionTarget
  userId: string
  pending: boolean
  error: unknown
  onCancel: () => void
  onSubmit: (input: {
    role: OrganizationMembership['role'] | ArtistMembership['role']
    reason: string
    confirmation: string
  }) => void
}) {
  const roles =
    target.type === 'organization'
      ? (['label_admin', 'label_user'] as const)
      : (['artist_admin', 'artist_user'] as const)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      role: String(data.get('role')) as (typeof roles)[number],
      reason: String(data.get('reason') ?? '').trim(),
      confirmation: String(data.get('confirmation') ?? '').trim(),
    })
  }

  return (
    <section
      className="admin-action-panel"
      aria-labelledby="role-correction-heading"
    >
      <div>
        <p className="eyebrow">Auditert handling</p>
        <h2 id="role-correction-heading">
          Korriger rolle i {target.scopeName}
        </h2>
        <p>
          Forrige og ny rolle, aktør, målbruker og begrunnelse registreres av
          Laravel.
        </p>
      </div>
      {error ? (
        <FeedbackBanner title="Kunne ikke korrigere rollen" tone="error">
          {formError(error)}
        </FeedbackBanner>
      ) : null}
      <Form className="form-stack" method="post" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="corrected-role">Ny rolle</label>
          <select defaultValue={target.role} id="corrected-role" name="role">
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>
        <AuditFields
          confirmationError={fieldError(error, 'confirmation')}
          reasonError={fieldError(error, 'reason')}
          userId={userId}
        />
        <div className="resource-form-actions">
          <button
            className="button button--secondary"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            Avbryt
          </button>
          <button
            className="button button--primary"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Lagrer …' : 'Bekreft rollekorrigering'}
          </button>
        </div>
      </Form>
    </section>
  )
}

export function AccountStatusPanel({
  status,
  userId,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  status: 'active' | 'suspended'
  userId: string
  pending: boolean
  error: unknown
  onCancel: () => void
  onSubmit: (input: { reason: string; confirmation: string }) => void
}) {
  const suspending = status === 'active'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      reason: String(data.get('reason') ?? '').trim(),
      confirmation: String(data.get('confirmation') ?? '').trim(),
    })
  }

  return (
    <section
      className={`admin-action-panel${suspending ? ' admin-action-panel--danger' : ''}`}
      aria-labelledby="account-status-action-heading"
    >
      <div>
        <p className="eyebrow">Auditert handling</p>
        <h2 id="account-status-action-heading">
          {suspending ? 'Suspender brukerkontoen' : 'Gjenåpne brukerkontoen'}
        </h2>
        <p>
          {suspending
            ? 'Alle aktive økter og tokens tilbakekalles umiddelbart.'
            : 'Gamle økter forblir tilbakekalt. Brukeren må logge inn på nytt.'}
        </p>
      </div>
      {error ? (
        <FeedbackBanner title="Kunne ikke endre kontostatus" tone="error">
          {formError(error)}
        </FeedbackBanner>
      ) : null}
      <Form className="form-stack" method="post" onSubmit={handleSubmit}>
        <AuditFields
          confirmationError={fieldError(error, 'confirmation')}
          reasonError={fieldError(error, 'reason')}
          userId={userId}
        />
        <div className="resource-form-actions">
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
            type="submit"
          >
            {pending
              ? 'Oppdaterer …'
              : suspending
                ? 'Bekreft kontosuspensjon'
                : 'Bekreft gjenåpning'}
          </button>
        </div>
      </Form>
    </section>
  )
}
