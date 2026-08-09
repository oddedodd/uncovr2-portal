import { Link, Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="auth-page">
      <main className="auth-main">
        <div className="auth-shell">
          <Link
            className="auth-logo-link"
            to="/"
            aria-label="Uncovr admin, forsiden"
          >
            <img alt="" className="auth-logo" src="/uncovr-logo.png" />
          </Link>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
