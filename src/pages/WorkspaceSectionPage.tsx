import { useLocation, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { navigationForRole, type PortalOutletContext } from '../lib/portal.ts'
import { ForbiddenPage } from './states/ForbiddenPage.tsx'

const sectionNames: Record<string, string> = {
  '/labels': 'Labels',
  '/artists': 'Artister',
  '/releases': 'Utgivelser',
  '/team': 'Team',
}

export function WorkspaceSectionPage() {
  const location = useLocation()
  const { workspace } = useOutletContext<PortalOutletContext>()
  const allowed = navigationForRole(workspace?.role).some(
    (item) => item.to === location.pathname,
  )

  if (!workspace || !allowed) return <ForbiddenPage />

  const name = sectionNames[location.pathname] ?? 'Arbeidsområde'

  return (
    <section>
      <p className="eyebrow">{workspace.name}</p>
      <h1 className="page-title">{name}</h1>
      <p className="page-intro">
        Rollen din har tilgang til denne delen. Funksjonene bygges i neste
        portal-milepæl.
      </p>
      <FeedbackBanner title="Grunnmuren er klar" tone="info">
        Data og handlinger kobles til de policybeskyttede Laravel-endepunktene i
        den tilhørende arbeidsflyten.
      </FeedbackBanner>
    </section>
  )
}
