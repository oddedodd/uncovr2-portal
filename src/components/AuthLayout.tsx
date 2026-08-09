import { Link, Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="brand" to="/" aria-label="Uncovr admin, forsiden">
          uncovr<span>.</span>
        </Link>
        <span>Adminportal</span>
      </header>
      <main className="auth-main">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <p className="eyebrow">Uncovr admin</p>
          <h1 id="auth-intro-title">Musikken har en historie.</h1>
          <p>
            Administrer labels, artister og utgivelser i én trygg arbeidsflate.
          </p>
        </section>
        <div className="auth-panel">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
