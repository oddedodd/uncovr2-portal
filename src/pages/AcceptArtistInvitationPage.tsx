import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { acceptArtistInvitation } from '../lib/artists.ts'
import { authKeys } from '../lib/auth.ts'

export function AcceptArtistInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const accept = useMutation({
    mutationFn: () => acceptArtistInvitation(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.currentUser })
    },
  })

  if (!token) {
    return (
      <FeedbackBanner title="Invitasjonslenken mangler token" tone="error">
        Åpne hele lenken fra e-posten, eller be administratoren sende en ny
        invitasjon.
      </FeedbackBanner>
    )
  }

  return (
    <section className="invitation-page">
      <p className="eyebrow">Artistinvitasjon</p>
      <h1 className="page-title">Bli med i artistarbeidsområdet</h1>
      <p className="page-intro">
        Laravel kontrollerer e-postadresse, utløpstid og at invitasjonen ikke er
        brukt tidligere.
      </p>

      {accept.isError ? (
        <FeedbackBanner title="Kunne ikke godta invitasjonen" tone="error">
          Invitasjonen kan være utløpt, allerede brukt eller knyttet til en
          annen e-postadresse.
        </FeedbackBanner>
      ) : null}
      {accept.isSuccess ? (
        <FeedbackBanner title="Invitasjonen er godtatt" tone="success">
          Artistrollen er lagt til kontoen din.
        </FeedbackBanner>
      ) : null}

      <div className="invitation-actions">
        {accept.isSuccess ? (
          <button
            className="button button--primary"
            onClick={() => navigate('/', { replace: true })}
            type="button"
          >
            Gå til oversikten
          </button>
        ) : (
          <button
            className="button button--primary"
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
            type="button"
          >
            {accept.isPending ? 'Godtar …' : 'Godta invitasjonen'}
          </button>
        )}
        <Link className="button button--secondary" to="/">
          Avbryt
        </Link>
      </div>
    </section>
  )
}
