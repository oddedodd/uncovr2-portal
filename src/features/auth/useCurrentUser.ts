import { useQuery } from '@tanstack/react-query'
import { authKeys, getCurrentUser } from '../../lib/auth.ts'

const authBootstrapStaleTimeMs = 5 * 60 * 1000

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: authBootstrapStaleTimeMs,
  })
}
