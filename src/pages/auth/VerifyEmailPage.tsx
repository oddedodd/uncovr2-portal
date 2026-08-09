import { useMutation } from '@tanstack/react-query'
import { Form, Link, useSearchParams } from 'react-router'
import { AuthCard } from '../../components/AuthCard.tsx'
import { FeedbackBanner } from '../../components/FeedbackBanner.tsx'
import { FormField } from '../../components/FormField.tsx'
import { SubmitButton } from '../../components/SubmitButton.tsx'
import { formError } from '../../features/auth/validation.ts'
import { resendVerification } from '../../lib/auth.ts'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const mutation = useMutation({ mutationFn: resendVerification })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mutation.mutate(String(data.get('email') ?? ''))
  }

  return (
    <AuthCard
      title="Bekreft e-posten din"
      description="Åpne lenken i e-posten fra Uncovr. Lenken er tidsbegrenset og kan bare brukes én gang."
      footer={<Link to="/login">Tilbake til innlogging</Link>}
    >
      {mutation.isSuccess ? (
        <FeedbackBanner title="Ny e-post er bestilt" tone="success">
          Hvis kontoen finnes og ikke er bekreftet, sender vi en ny lenke.
        </FeedbackBanner>
      ) : null}
      {mutation.isError ? (
        <FeedbackBanner title="Kunne ikke sende på nytt" tone="error">
          {formError(mutation.error)}
        </FeedbackBanner>
      ) : null}
      <Form className="form-stack" method="post" onSubmit={handleSubmit}>
        <FormField
          autoComplete="email"
          defaultValue={searchParams.get('email') ?? ''}
          label="E-post"
          name="email"
          required
          type="email"
        />
        <SubmitButton pending={mutation.isPending} pendingLabel="Sender …">
          Send ny bekreftelseslenke
        </SubmitButton>
      </Form>
    </AuthCard>
  )
}
