import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'En ukjent feil oppstod.'

  return (
    <main className="centered-state">
      <section className="empty-state">
        <p className="eyebrow">Uventet feil</p>
        <h1>Portalen kunne ikke vise siden.</h1>
        <p>{message}</p>
        <Link className="button button--secondary" to="/">
          Til oversikten
        </Link>
      </section>
    </main>
  )
}
