import type { ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { AuthCard } from '../components/AuthCard.tsx'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { useCurrentUser } from '../features/auth/useCurrentUser.ts'
import { ApiError } from '../lib/api.ts'
import { authRoute } from '../lib/authNavigation.ts'

interface InvitationEntryPageProps {
  kind: 'label' | 'artist'
  children: ReactNode
}

const copy = {
  label: {
    role: 'Label Admin eller Label User',
    area: 'labelarbeidsområdet',
  },
  artist: {
    role: 'Artist Admin eller Artist User',
    area: 'artistarbeidsområdet',
  },
}

export function InvitationEntryPage({
  kind,
  children,
}: InvitationEntryPageProps) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const user = useCurrentUser()
  const token = searchParams.get('token') ?? ''
  const returnTo = `${location.pathname}${location.search}`
  const invitation = copy[kind]

  if (!token) {
    return (
      <AuthCard
        title="Invitasjonslenken er ufullstendig"
        description="Tokenet mangler fra lenken. Åpne hele lenken fra invitasjonsmailen."
        footer={<Link to="/login">Gå til innlogging</Link>}
      >
        <FeedbackBanner title="Kan ikke åpne invitasjonen" tone="error">
          Be administratoren sende invitasjonen på nytt hvis problemet
          fortsetter.
        </FeedbackBanner>
      </AuthCard>
    )
  }

  if (user.isPending) {
    return (
      <main className="centered-state" aria-busy="true">
        <span className="loading-indicator" aria-hidden="true" />
        <p>Kontrollerer om du allerede har en kontoøkt …</p>
      </main>
    )
  }

  if (user.error instanceof ApiError && user.error.status === 401) {
    return (
      <AuthCard
        title="Du er invitert til Uncovr"
        description={`Invitasjonen gir deg tilgang til ${invitation.area}, men den oppretter ikke en brukerkonto automatisk.`}
        footer={
          <p>
            Invitasjonen er knyttet til mottakeradressen og kan bare brukes én
            gang.
          </p>
        }
      >
        <div className="invitation-choice">
          <div>
            <h3>Har du ikke Uncovr-konto?</h3>
            <p>
              Opprett konto med samme e-postadresse som invitasjonen ble sendt
              til. Du velger passord selv.
            </p>
            <Link
              className="button button--primary button--full"
              to={authRoute('/register', returnTo)}
            >
              Opprett konto og fortsett
            </Link>
          </div>
          <div>
            <h3>Har du allerede konto?</h3>
            <p>
              Logg inn med den eksisterende kontoen. Du sendes tilbake hit
              etterpå.
            </p>
            <Link
              className="button button--secondary button--full"
              to={authRoute('/login', returnTo)}
            >
              Logg inn med eksisterende konto
            </Link>
          </div>
        </div>
        <p className="invitation-role-note">
          Rollen ({invitation.role}) bestemmes av invitasjonen og bekreftes før
          du godtar.
        </p>
      </AuthCard>
    )
  }

  if (user.isError) {
    return (
      <AuthCard
        title="Kunne ikke åpne invitasjonen"
        description="Portalen fikk ikke kontrollert kontoen din."
      >
        <FeedbackBanner title="Kontakt med API-et feilet" tone="error">
          <button
            className="button button--secondary"
            onClick={() => void user.refetch()}
            type="button"
          >
            Prøv igjen
          </button>
        </FeedbackBanner>
      </AuthCard>
    )
  }

  return children
}
