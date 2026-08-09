import { Link, useLocation } from 'react-router'
import { AuthCard } from '../../components/AuthCard.tsx'
import { FeedbackBanner } from '../../components/FeedbackBanner.tsx'

export function SessionExpiredPage() {
  const location = useLocation()
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? '/'

  return (
    <AuthCard
      title="Logg inn for å fortsette"
      description="Økten mangler, har utløpt eller er tilbakekalt."
    >
      <FeedbackBanner title="Ingen aktiv økt" tone="info">
        Arbeidet ditt er ikke sendt. Logg inn igjen før du fortsetter.
      </FeedbackBanner>
      <Link
        className="button button--primary button--full"
        state={{ returnTo }}
        to="/login"
      >
        Gå til innlogging
      </Link>
    </AuthCard>
  )
}
