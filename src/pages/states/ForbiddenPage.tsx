import { Link } from 'react-router'

export function ForbiddenPage() {
  return (
    <section className="empty-state">
      <p className="eyebrow">403 · Ingen tilgang</p>
      <h1>Dette arbeidsområdet er ikke tilgjengelig.</h1>
      <p>
        Menyen skjuler irrelevante valg, men Laravel avgjør alltid den faktiske
        tilgangen. Bytt arbeidsområde eller kontakt en administrator.
      </p>
      <Link className="button button--secondary" to="/">
        Til oversikten
      </Link>
    </section>
  )
}
