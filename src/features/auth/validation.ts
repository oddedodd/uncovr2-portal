import { ApiError } from '../../lib/api.ts'

type ValidationDetails = {
  fields?: Record<string, string[]>
}

export function fieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError) || error.code !== 'validation_failed') {
    return undefined
  }

  const details = error.details as ValidationDetails | undefined
  return details?.fields?.[field]?.[0]
}

export function formError(error: unknown): string | undefined {
  if (!error) return undefined
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Noe gikk galt. Prøv igjen.'
}
