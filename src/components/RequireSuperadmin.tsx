import type { PropsWithChildren } from 'react'
import { useOutletContext } from 'react-router'
import type { PortalOutletContext } from '../lib/portal.ts'
import { ForbiddenPage } from '../pages/states/ForbiddenPage.tsx'

export function RequireSuperadmin({ children }: PropsWithChildren) {
  const { user } = useOutletContext<PortalOutletContext>()

  if (!user.is_superadmin) return <ForbiddenPage />

  return children
}
