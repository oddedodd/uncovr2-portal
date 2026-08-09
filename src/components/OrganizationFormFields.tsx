import { FormField } from './FormField.tsx'

export interface OrganizationFieldValues {
  name?: string | null
  legal_name?: string | null
  description?: string | null
  website_url?: string | null
}

export function OrganizationFormFields({
  values = {},
  errors = {},
}: {
  values?: OrganizationFieldValues
  errors?: Partial<Record<keyof OrganizationFieldValues, string>>
}) {
  return (
    <>
      <FormField
        defaultValue={values.name ?? ''}
        error={errors.name}
        label="Labelnavn"
        maxLength={150}
        minLength={2}
        name="name"
        required
      />
      <FormField
        autoComplete="organization"
        defaultValue={values.legal_name ?? ''}
        error={errors.legal_name}
        label="Juridisk navn"
        maxLength={200}
        name="legal_name"
      />
      <div className="form-field">
        <label htmlFor="organization-description">Beskrivelse</label>
        <textarea
          aria-describedby={
            errors.description ? 'organization-description-error' : undefined
          }
          aria-invalid={errors.description ? true : undefined}
          defaultValue={values.description ?? ''}
          id="organization-description"
          maxLength={5000}
          name="description"
          rows={6}
        />
        {errors.description ? (
          <span
            className="field-error"
            id="organization-description-error"
            role="alert"
          >
            {errors.description}
          </span>
        ) : null}
      </div>
      <FormField
        defaultValue={values.website_url ?? ''}
        error={errors.website_url}
        label="Nettside"
        maxLength={2048}
        name="website_url"
        placeholder="https://"
        type="url"
      />
    </>
  )
}
