import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Link, useNavigate } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { OrganizationFormFields } from '../components/OrganizationFormFields.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { organizationInput } from '../lib/organizationForm.ts'
import { onboardOrganization, organizationKeys } from '../lib/organizations.ts'
import { platformKeys } from '../lib/platform.ts'

export function CreateOrganizationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: onboardOrganization,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
        queryClient.invalidateQueries({ queryKey: platformKeys.overview }),
      ])
      navigate(`/labels/${result.organization.id}`, {
        replace: true,
        state: {
          created: true,
          administratorEmail: result.administrator_invitation.email,
        },
      })
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate({
      organization: organizationInput(data),
      administrator: {
        email: String(data.get('administrator_email') ?? '').trim(),
      },
      confirmation: true,
    })
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">Superadmin · Labels</p>
        <h1 className="page-title">Opprett label</h1>
        <p className="page-intro">
          Labelen og invitasjonen til den første Label Admin opprettes samlet.
          Hvis ett av stegene feiler, opprettes ingenting.
        </p>
      </div>

      {create.isError ? (
        <FeedbackBanner title="Kunne ikke opprette label" tone="error">
          {formError(create.error)}
        </FeedbackBanner>
      ) : null}

      <Form
        className="settings-card form-stack"
        method="post"
        onSubmit={handleSubmit}
      >
        <OrganizationFormFields
          errors={{
            name: fieldError(create.error, 'organization.name'),
            legal_name: fieldError(create.error, 'organization.legal_name'),
            description: fieldError(create.error, 'organization.description'),
            website_url: fieldError(create.error, 'organization.website_url'),
          }}
        />
        <div className="form-divider" aria-hidden="true" />
        <FormField
          autoComplete="email"
          error={fieldError(create.error, 'administrator.email')}
          hint="Personen får en tidsbegrenset invitasjon på e-post."
          label="E-post til første Label Admin"
          name="administrator_email"
          required
          type="email"
        />
        <label className="checkbox-field">
          <input name="confirmation" required type="checkbox" />
          <span>
            Jeg bekrefter at labelen skal opprettes og at denne personen skal
            inviteres som Label Admin.
          </span>
        </label>
        <div className="resource-form-actions">
          <Link className="button button--secondary" to="/labels">
            Avbryt
          </Link>
          <SubmitButton pending={create.isPending} pendingLabel="Oppretter …">
            Opprett label
          </SubmitButton>
        </div>
      </Form>
    </div>
  )
}
