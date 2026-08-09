import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1 className="page-title">Siden finnes ikke.</h1>
      <p className="page-intro">
        Gå tilbake til <Link to="/">oversikten</Link>.
      </p>
    </main>
  )
}
