import {
  isEditableReleaseStatus,
  releaseStatusLabel,
  type Release,
} from '../lib/releases.ts'
import { FeedbackBanner } from './FeedbackBanner.tsx'

/**
 * Rettigheten kommer fra Laravel per utgivelse og utledes aldri fra rolle her.
 * Statusen brukes bare til å forklare et nei: en manglende tildeling og en
 * status som ikke kan endres krever ulike handlinger av brukeren.
 *
 * Alle byggerrutene for én utgivelse viser den samme forklaringen, så den bor
 * her i stedet for i hver rute.
 */
export function ReleaseEditNotice({ release }: { release: Release }) {
  if (release.permissions.can_update) return null

  return isEditableReleaseStatus(release.status) ? (
    <FeedbackBanner title="Du kan ikke redigere denne utgivelsen" tone="info">
      Du er ikke tildelt denne utgivelsen. Be en{' '}
      {release.owner.type === 'artist' ? 'artist-admin' : 'label-admin'} om
      tilgang.
    </FeedbackBanner>
  ) : (
    <FeedbackBanner title="Utgivelsen er låst i denne statusen" tone="info">
      Utgivelser med status «{releaseStatusLabel(release.status)}» kan ikke
      endres. Bare utkast og avpubliserte utgivelser kan redigeres.
    </FeedbackBanner>
  )
}
