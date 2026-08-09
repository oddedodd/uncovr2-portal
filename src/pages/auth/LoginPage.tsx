import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router'
import { AuthCard } from '../../components/AuthCard.tsx'
import { FeedbackBanner } from '../../components/FeedbackBanner.tsx'
import { FormField } from '../../components/FormField.tsx'
import { SubmitButton } from '../../components/SubmitButton.tsx'
import { fieldError, formError } from '../../features/auth/validation.ts'
import { ApiError } from '../../lib/api.ts'
import { authKeys, getCurrentWorkspaces, login } from '../../lib/auth.ts'
import { authRoute, readInvitationReturnTo } from '../../lib/authNavigation.ts'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  const reset = searchParams.get('reset') === '1'
  const returnTo = readInvitationReturnTo(location.search, location.state)
  const invitation = Boolean(returnTo)
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (response) => {
      queryClient.setQueryData(authKeys.currentUser, response.data.user)
      void queryClient.prefetchQuery({
        queryKey: authKeys.workspaces,
        queryFn: getCurrentWorkspaces,
      })
      navigate(returnTo ?? '/', { replace: true })
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mutation.mutate({
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
    })
  }

  const needsVerification =
    mutation.error instanceof ApiError &&
    mutation.error.code === 'email_not_verified'
  const email = mutation.variables?.email ?? ''

  return (
    <AuthCard
      title={invitation ? 'Logg inn med eksisterende konto' : 'Logg inn'}
      description={
        invitation
          ? 'Dette valget er for deg som allerede har opprettet en Uncovr-konto.'
          : 'Fortsett til arbeidsområdene dine.'
      }
      footer={
        <p>
          {invitation ? 'Har du ikke konto ennå? ' : 'Ny på Uncovr? '}
          <Link to={authRoute('/register', returnTo)}>
            {invitation ? 'Opprett konto for invitasjonen' : 'Opprett konto'}
          </Link>
        </p>
      }
    >
      {invitation ? (
        <FeedbackBanner title="Invitasjonen er tatt vare på" tone="info">
          Etter innlogging sendes du tilbake til invitasjonen. Kontoens
          e-postadresse må være den samme som mottakeradressen.
        </FeedbackBanner>
      ) : null}
      {registered ? (
        <FeedbackBanner title="Sjekk innboksen din" tone="success">
          Vi har sendt en bekreftelseslenke hvis adressen kan registreres.
        </FeedbackBanner>
      ) : null}
      {reset ? (
        <FeedbackBanner title="Passordet er endret" tone="success">
          Du kan nå logge inn med det nye passordet.
        </FeedbackBanner>
      ) : null}
      {mutation.isError ? (
        <FeedbackBanner title="Kunne ikke logge inn" tone="error">
          <p>{formError(mutation.error)}</p>
          {needsVerification ? (
            <Link
              to={authRoute('/verify-email', returnTo, {
                email,
              })}
            >
              Send bekreftelsen på nytt
            </Link>
          ) : null}
        </FeedbackBanner>
      ) : null}
      <Form className="form-stack" method="post" onSubmit={handleSubmit}>
        <FormField
          autoComplete="email"
          error={fieldError(mutation.error, 'email')}
          label="E-post"
          name="email"
          required
          type="email"
        />
        <FormField
          autoComplete="current-password"
          error={fieldError(mutation.error, 'password')}
          label="Passord"
          name="password"
          required
          type="password"
        />
        <div className="form-actions-row">
          <Link to={authRoute('/forgot-password', returnTo)}>
            Glemt passord?
          </Link>
        </div>
        <SubmitButton pending={mutation.isPending} pendingLabel="Logger inn …">
          Logg inn
        </SubmitButton>
      </Form>
    </AuthCard>
  )
}
