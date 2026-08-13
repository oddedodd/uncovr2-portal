import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'
import { createQueryClient } from './queryClient.ts'

/**
 * Uten `client` lages en fersk klient per montering. Tester er avhengige av
 * det for ikke å arve cache fra forrige test; appen sender inn den delte
 * instansen som route-loaderne skriver til.
 */
export function AppProviders({
  children,
  client,
}: PropsWithChildren<{ client?: QueryClient }>) {
  const [fallbackClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={client ?? fallbackClient}>
      {children}
    </QueryClientProvider>
  )
}
