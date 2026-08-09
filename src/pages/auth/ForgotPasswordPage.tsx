import { useMutation } from '@tanstack/react-query'
import { Form, Link, useLocation } from 'react-router'
import { AuthCard } from '../../components/AuthCard.tsx'
import { FeedbackBanner } from '../../components/FeedbackBanner.tsx'
import { FormField } from '../../components/FormField.tsx'
import { SubmitButton } from '../../components/SubmitButton.tsx'
import { formError } from '../../features/auth/validation.ts'
import { forgotPassword } from '../../lib/auth.ts'
import { authRoute, readInvitationReturnTo } from '../../lib/authNavigation.ts'

export function ForgotPasswordPage() {
  const location = useLocation()
  const returnTo = readInvitationReturnTo(location.search, location.state)
  const mutation = useMutation({ mutationFn: forgotPassword })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mutation.mutate(String(data.get('email') ?? ''))
  }

  return (
    <AuthCard
      title="Glemt passord"
      description="Skriv inn e-postadressen. Hvis kontoen finnes, sender vi en sikker tilbakestillingslenke."
      footer={
        <Link to={authRoute('/login', returnTo)}>Tilbake til innlogging</Link>
      }
    >
      {mutation.isSuccess ? (
        <FeedbackBanner title="Sjekk innboksen" tone="success">
          Forespørselen er mottatt. Av sikkerhetsgrunner bekrefter vi ikke om
          adressen finnes. Etter at passordet er endret kan du åpne den
          opprinnelige invitasjonslenken igjen.
        </FeedbackBanner>
      ) : null}
      {mutation.isError ? (
        <FeedbackBanner title="Kunne ikke sende forespørselen" tone="error">
          {formError(mutation.error)}
        </FeedbackBanner>
      ) : null}
      <Form className="form-stack" method="post" onSubmit={handleSubmit}>
        <FormField
          autoComplete="email"
          label="E-post"
          name="email"
          required
          type="email"
        />
        <SubmitButton pending={mutation.isPending} pendingLabel="Sender …">
          Send tilbakestillingslenke
        </SubmitButton>
      </Form>
    </AuthCard>
  )
}
