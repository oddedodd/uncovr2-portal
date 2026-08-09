import { useQuery } from '@tanstack/react-query'
import { authKeys, getCurrentUser } from '../../lib/auth.ts'

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 30_000,
  })
}
