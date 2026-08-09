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
import { authKeys, getCurrentUser, login } from '../../lib/auth.ts'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  const reset = searchParams.get('reset') === '1'
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: async () => {
      await queryClient.fetchQuery({
        queryKey: authKeys.currentUser,
        queryFn: getCurrentUser,
      })
      const returnTo = (location.state as { returnTo?: string } | null)
        ?.returnTo
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
      title="Logg inn"
      description="Fortsett til arbeidsområdene dine."
      footer={
        <p>
          Ny på Uncovr? <Link to="/register">Opprett konto</Link>
        </p>
      }
    >
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
            <Link to={`/verify-email?email=${encodeURIComponent(email)}`}>
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
          <Link to="/forgot-password">Glemt passord?</Link>
        </div>
        <SubmitButton pending={mutation.isPending} pendingLabel="Logger inn …">
          Logg inn
        </SubmitButton>
      </Form>
    </AuthCard>
  )
}
