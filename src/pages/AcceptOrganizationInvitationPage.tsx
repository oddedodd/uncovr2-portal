import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { authKeys } from '../lib/auth.ts'
import { acceptOrganizationInvitation } from '../lib/organizations.ts'

export function AcceptOrganizationInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const accept = useMutation({
    mutationFn: () => acceptOrganizationInvitation(token),
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
      <p className="eyebrow">Labelinvitasjon</p>
      <h1 className="page-title">Bli med i arbeidsområdet</h1>
      <p className="page-intro">
        Laravel kontrollerer at invitasjonen tilhører e-postadressen på kontoen
        din, ikke er utløpt og ikke allerede er brukt.
      </p>

      {accept.isError ? (
        <FeedbackBanner title="Kunne ikke godta invitasjonen" tone="error">
          Invitasjonen kan være utløpt, allerede brukt eller knyttet til en
          annen e-postadresse.
        </FeedbackBanner>
      ) : null}
      {accept.isSuccess ? (
        <FeedbackBanner title="Invitasjonen er godtatt" tone="success">
          Rollen er lagt til kontoen din. Gå til oversikten for å åpne labelen.
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
