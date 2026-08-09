import { NavLink, Outlet } from 'react-router'
import '../App.css'

const navigation = [
  { label: 'Oversikt', to: '/' },
  { label: 'Labels', to: '/labels' },
  { label: 'Artister', to: '/artists' },
  { label: 'Utgivelser', to: '/releases' },
]

export function PortalLayout() {
  return (
    <div className="portal">
      <a className="skip-link" href="#main-content">
        Hopp til hovedinnhold
      </a>
      <header className="portal-header">
        <NavLink className="brand" to="/" aria-label="Uncovr admin, forsiden">
          uncovr<span>.</span>
        </NavLink>
        <span className="environment-badge">Lokal utvikling</span>
      </header>
      <div className="portal-grid">
        <nav className="sidebar" aria-label="Hovednavigasjon">
          <p className="sidebar-label">Arbeidsområde</p>
          <ul className="nav-list">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  className="nav-link"
                  to={item.to}
                  end={item.to === '/'}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="portal-main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
