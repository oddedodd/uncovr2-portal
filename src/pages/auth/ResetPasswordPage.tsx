import { useMutation } from '@tanstack/react-query'
import { Form, Link, useNavigate, useSearchParams } from 'react-router'
import { AuthCard } from '../../components/AuthCard.tsx'
import { FeedbackBanner } from '../../components/FeedbackBanner.tsx'
import { FormField } from '../../components/FormField.tsx'
import { SubmitButton } from '../../components/SubmitButton.tsx'
import { fieldError, formError } from '../../features/auth/validation.ts'
import { resetPassword } from '../../lib/auth.ts'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''
  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => navigate('/login?reset=1', { replace: true }),
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mutation.mutate({
      email: String(data.get('email') ?? ''),
      token,
      password: String(data.get('password') ?? ''),
      password_confirmation: String(data.get('password_confirmation') ?? ''),
    })
  }

  if (!token) {
    return (
      <AuthCard
        title="Ugyldig lenke"
        description="Tilbakestillingslenken mangler et token eller er ufullstendig."
        footer={<Link to="/forgot-password">Be om en ny lenke</Link>}
      >
        <FeedbackBanner title="Kan ikke tilbakestille passordet" tone="error">
          Åpne hele lenken fra e-posten, eller be om en ny.
        </FeedbackBanner>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Velg nytt passord"
      description="Det nye passordet logger ut alle eksisterende enheter."
      footer={<Link to="/login">Tilbake til innlogging</Link>}
    >
      {mutation.isError ? (
        <FeedbackBanner title="Passordet ble ikke endret" tone="error">
          {formError(mutation.error)}
        </FeedbackBanner>
      ) : null}
      <Form className="form-stack" method="post" onSubmit={handleSubmit}>
        <FormField
          autoComplete="email"
          defaultValue={email}
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
          label="Nytt passord"
          minLength={15}
          name="password"
          required
          type="password"
        />
        <FormField
          autoComplete="new-password"
          label="Gjenta nytt passord"
          minLength={15}
          name="password_confirmation"
          required
          type="password"
        />
        <SubmitButton pending={mutation.isPending} pendingLabel="Lagrer …">
          Lagre nytt passord
        </SubmitButton>
      </Form>
    </AuthCard>
  )
}
