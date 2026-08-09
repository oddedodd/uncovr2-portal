import { useMutation } from '@tanstack/react-query'
import { Form, Link, useLocation, useNavigate } from 'react-router'
import { AuthCard } from '../../components/AuthCard.tsx'
import { FeedbackBanner } from '../../components/FeedbackBanner.tsx'
import { FormField } from '../../components/FormField.tsx'
import { SubmitButton } from '../../components/SubmitButton.tsx'
import { fieldError, formError } from '../../features/auth/validation.ts'
import { register, type RegisterInput } from '../../lib/auth.ts'
import { authRoute, readInvitationReturnTo } from '../../lib/authNavigation.ts'

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = readInvitationReturnTo(location.search, location.state)
  const invitation = Boolean(returnTo)
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (_result, input) =>
      navigate(
        authRoute('/verify-email', returnTo, {
          email: input.email,
          registered: '1',
        }),
        {
          replace: true,
        },
      ),
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const input: RegisterInput = {
      display_name: String(data.get('display_name') ?? ''),
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      password_confirmation: String(data.get('password_confirmation') ?? ''),
      consents: {
        terms: data.get('terms') === 'on',
        privacy: data.get('privacy') === 'on',
        marketing_email: data.get('marketing_email') === 'on',
        marketing_push: false,
      },
    }
    mutation.mutate(input)
  }

  return (
    <AuthCard
      title={invitation ? 'Opprett konto for invitasjonen' : 'Opprett konto'}
      description={
        invitation
          ? 'Bruk nøyaktig samme e-postadresse som invitasjonen ble sendt til, og velg ditt eget passord.'
          : 'Registrer en personlig konto. Tilganger gis separat av Uncovr eller teamet ditt.'
      }
      footer={
        <p>
          Har du allerede konto?{' '}
          <Link to={authRoute('/login', returnTo)}>Logg inn</Link>
        </p>
      }
    >
      {invitation ? (
        <FeedbackBanner title="Invitasjonen følger registreringen" tone="info">
          Når e-postadressen er bekreftet og du har logget inn, sendes du
          tilbake for å godta rollen.
        </FeedbackBanner>
      ) : null}
      {mutation.isError ? (
        <FeedbackBanner title="Kontroller opplysningene" tone="error">
          {formError(mutation.error)}
        </FeedbackBanner>
      ) : null}
      <Form className="form-stack" method="post" onSubmit={handleSubmit}>
        <FormField
          autoComplete="name"
          error={fieldError(mutation.error, 'display_name')}
          label="Navn"
          name="display_name"
          required
        />
        <FormField
          autoComplete="email"
          error={fieldError(mutation.error, 'email')}
          label="E-post"
          name="email"
          required
          type="email"
        />
        <FormField
          autoComplete="new-password"
          error={fieldError(mutation.error, 'password')}
          hint="Bruk minst 15 tegn."
          label="Passord"
          minLength={15}
          name="password"
          required
          type="password"
        />
        <FormField
          autoComplete="new-password"
          label="Gjenta passord"
          minLength={15}
          name="password_confirmation"
          required
          type="password"
        />
        <fieldset className="consent-group">
          <legend>Samtykker</legend>
          <label className="checkbox-field">
            <input name="terms" required type="checkbox" />
            <span>Jeg godtar bruksvilkårene.</span>
          </label>
          <label className="checkbox-field">
            <input name="privacy" required type="checkbox" />
            <span>Jeg har lest personvernerklæringen.</span>
          </label>
          <label className="checkbox-field">
            <input name="marketing_email" type="checkbox" />
            <span>Send meg valgfrie produktnyheter på e-post.</span>
          </label>
        </fieldset>
        <SubmitButton pending={mutation.isPending} pendingLabel="Oppretter …">
          Opprett konto
        </SubmitButton>
      </Form>
    </AuthCard>
  )
}
