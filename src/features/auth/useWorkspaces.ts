import { useQuery } from '@tanstack/react-query'
import { authKeys, getCurrentWorkspaces } from '../../lib/auth.ts'

export function useWorkspaces() {
  return useQuery({
    queryKey: authKeys.workspaces,
    queryFn: getCurrentWorkspaces,
    retry: false,
    staleTime: 30_000,
  })
}
