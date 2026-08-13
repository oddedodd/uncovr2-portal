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

/**
 * 422-svarene har en generisk toppmelding («The submitted data is invalid.»),
 * mens den nyttige teksten ligger per felt. For handlinger uten skjemafelt å
 * feste feilen på — som innsending og publisering — er feltmeldingene det
 * eneste som forklarer hva som mangler.
 */
export function validationMessages(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== 'validation_failed') {
    return []
  }

  const details = error.details as ValidationDetails | undefined
  return Object.values(details?.fields ?? {}).flat()
}

export function formError(error: unknown): string | undefined {
  if (!error) return undefined
  if (error instanceof ApiError) {
    const localizedMessages: Record<string, string> = {
      invalid_credentials:
        'E-postadressen eller passordet er feil. Hvis du ikke har opprettet konto ennå, velg «Opprett konto».',
      email_not_verified: 'E-postadressen må bekreftes før du kan logge inn.',
      account_suspended:
        'Kontoen er suspendert. Kontakt en administrator for hjelp.',
    }

    return localizedMessages[error.code] ?? error.message
  }
  if (error instanceof Error) return error.message
  return 'Noe gikk galt. Prøv igjen.'
}
