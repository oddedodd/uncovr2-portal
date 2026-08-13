import { QueryClient } from '@tanstack/react-query'

/**
 * Route-loaderne i `router.tsx` fyller cachen før komponentene monterer. De
 * kjører utenfor React, så de må nå den samme klienten som AppProviders gir
 * videre — derfor finnes instansen på modulnivå og ikke bare i en komponent.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Nesten alle queries overstyrte allerede til false. Et nytt forsøk
        // dobler ventetiden før brukeren får se feilen, og Laravel svarer
        // deterministisk på 401/403 — det er ingenting å prøve om igjen.
        retry: false,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
