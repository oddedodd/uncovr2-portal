import { useMutation } from '@tanstack/react-query'
import { Form, Link, useLocation, useSearchParams } from 'react-router'
import { AuthCard } from '../../components/AuthCard.tsx'
import { FeedbackBanner } from '../../components/FeedbackBanner.tsx'
import { FormField } from '../../components/FormField.tsx'
import { SubmitButton } from '../../components/SubmitButton.tsx'
import { formError } from '../../features/auth/validation.ts'
import { resendVerification } from '../../lib/auth.ts'
import { authRoute, readInvitationReturnTo } from '../../lib/authNavigation.ts'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const returnTo = readInvitationReturnTo(location.search, location.state)
  const invitation = Boolean(returnTo)
  const registered = searchParams.get('registered') === '1'
  const mutation = useMutation({ mutationFn: resendVerification })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mutation.mutate(String(data.get('email') ?? ''))
  }

  return (
    <AuthCard
      title="Bekreft e-posten din"
      description={
        invitation
          ? 'Invitasjonen er lagret i denne portalfanen mens du bekrefter den nye kontoen.'
          : 'Åpne bekreftelseslenken i e-posten fra Uncovr i en ny fane.'
      }
      footer={
        <Link to={authRoute('/login', returnTo)}>Tilbake til innlogging</Link>
      }
    >
      {registered ? (
        <FeedbackBanner title="Kontoen er opprettet" tone="success">
          Åpne bekreftelsesmailen i en ny fane. Når adressen er bekreftet,
          lukker du den fanen og går tilbake hit. Invitasjonen og tokenet
          beholdes i denne fanen.
        </FeedbackBanner>
      ) : null}
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
      <Link
        className="button button--primary button--full"
        to={authRoute('/login', returnTo)}
      >
        Jeg har bekreftet e-posten – gå til innlogging
      </Link>
    </AuthCard>
  )
}
