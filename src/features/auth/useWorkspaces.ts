import { useQuery } from '@tanstack/react-query'
import { workspacesQueryOptions } from '../../lib/queryOptions.ts'

export function useWorkspaces() {
  return useQuery(workspacesQueryOptions)
}
