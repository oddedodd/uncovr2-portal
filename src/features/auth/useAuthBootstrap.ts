import { useCurrentUser } from './useCurrentUser.ts'
import { useWorkspaces } from './useWorkspaces.ts'

/**
 * /me og /me/workspaces er uavhengige endepunkter. Ved å abonnere på begge her
 * starter de i samme commit, i stedet for at arbeidsområdene må vente på at
 * innloggingssjekken slipper gjennom til PortalLayout. PortalLayout kaller
 * fortsatt useWorkspaces() selv og kobler seg på den samme forespørselen.
 */
export function useAuthBootstrap() {
  const user = useCurrentUser()
  useWorkspaces()
  return user
}
