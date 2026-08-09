import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Link, useNavigate } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { OrganizationFormFields } from '../components/OrganizationFormFields.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { organizationInput } from '../lib/organizationForm.ts'
import { createOrganization, organizationKeys } from '../lib/organizations.ts'
import { platformKeys } from '../lib/platform.ts'

export function CreateOrganizationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: createOrganization,
    onSuccess: async (organization) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
        queryClient.invalidateQueries({ queryKey: platformKeys.overview }),
      ])
      navigate(`/labels/${organization.id}`, {
        replace: true,
        state: { created: true },
      })
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    create.mutate(organizationInput(new FormData(event.currentTarget)))
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">Superadmin · Labels</p>
        <h1 className="page-title">Opprett label</h1>
        <p className="page-intro">
          Nye labels opprettes aktive. Du kan korrigere eller suspendere dem
          etterpå.
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
            name: fieldError(create.error, 'name'),
            legal_name: fieldError(create.error, 'legal_name'),
            description: fieldError(create.error, 'description'),
            website_url: fieldError(create.error, 'website_url'),
          }}
        />
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
