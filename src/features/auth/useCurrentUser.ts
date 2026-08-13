import { useQuery } from '@tanstack/react-query'
import { currentUserQueryOptions } from '../../lib/queryOptions.ts'

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions)
}
