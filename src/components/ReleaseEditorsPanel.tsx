import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'react-router'
import { fieldError, formError } from '../features/auth/validation.ts'
import { ApiError } from '../lib/api.ts'
import type { ArtistMember } from '../lib/artistTeam.ts'
import type { OrganizationMember } from '../lib/organizationTeam.ts'
import {
  artistMembersQueryOptions,
  organizationMembersQueryOptions,
} from '../lib/queryOptions.ts'
import {
  assignReleaseEditor,
  releaseKeys,
  removeReleaseEditor,
  type Release,
} from '../lib/releases.ts'
import { FeedbackBanner } from './FeedbackBanner.tsx'
import { SubmitButton } from './SubmitButton.tsx'

/**
 * Kandidatene hentes fra eierskopet til utgivelsen: artistens medlemmer for en
 * artisteid utgivelse, labelens for en labeleid. `user.id` er ULID-en Laravel
 * vil ha i tildelingen — `id` er medlemskapets id og gir 422.
 */
function candidates(members: Array<ArtistMember | OrganizationMember>) {
  return members
    .filter((member) => member.status === 'active')
    .map((member) => ({
      userId: member.user.id,
      email: member.user.email,
      displayName: member.user.display_name,
    }))
}

function assignmentError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'Du har ikke tilgang til å endre redaktører på denne utgivelsen.'
    }
    // 422 med `user_id` betyr at brukeren mangler aktiv tilgang til
    // eierskopet. Meldingen fra Laravel forklarer det; en generisk feil ikke.
    const userIdError = fieldError(error, 'user_id')
    if (userIdError) return userIdError
  }

  return formError(error)
}

export function ReleaseEditorsPanel({ release }: { release: Release }) {
  const queryClient = useQueryClient()
  const isArtistOwned = release.owner.type === 'artist'
  const artistMembers = useQuery({
    ...artistMembersQueryOptions(release.owner.id),
    enabled: isArtistOwned,
  })
  const organizationMembers = useQuery({
    ...organizationMembersQueryOptions(release.owner.id),
    enabled: !isArtistOwned,
  })
  const members = isArtistOwned ? artistMembers : organizationMembers
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: releaseKeys.detail(release.id),
      }),
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() }),
    ])
  }
  const assign = useMutation({
    mutationFn: (userId: string) => assignReleaseEditor(release.id, userId),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (userId: string) => removeReleaseEditor(release.id, userId),
    onSuccess: refresh,
  })

  const assigned = new Set(release.editors.map((editor) => editor.user_id))
  const available = candidates(members.data ?? []).filter(
    (candidate) => !assigned.has(candidate.userId),
  )

  function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const userId = String(data.get('user_id') ?? '')
    if (userId) assign.mutate(userId)
  }

  return (
    <section
      className="settings-card"
      aria-labelledby="release-editors-heading"
    >
      <div className="settings-card__heading">
        <h2 id="release-editors-heading">Tildelte redaktører</h2>
        <p>
          Tildel utgivelsen til et teammedlem. Den tildelte kan bygge sider og
          blokker på nettopp denne utgivelsen, og får beskjed på e-post.
        </p>
      </div>
      {assign.isError ? (
        <FeedbackBanner title="Kunne ikke tildele utgivelsen" tone="error">
          {assignmentError(assign.error)}
        </FeedbackBanner>
      ) : null}
      {remove.isError ? (
        <FeedbackBanner title="Kunne ikke fjerne tildelingen" tone="error">
          {assignmentError(remove.error)}
        </FeedbackBanner>
      ) : null}
      {assign.isSuccess ? (
        <FeedbackBanner title="Utgivelsen er tildelt" tone="success">
          Redaktøren kan nå redigere utgivelsen.
        </FeedbackBanner>
      ) : null}
      {members.isError ? (
        <FeedbackBanner title="Kunne ikke hente teamet" tone="error">
          {formError(members.error)}
        </FeedbackBanner>
      ) : null}
      {release.editors.length === 0 ? (
        <div className="inline-empty">Ingen redaktører er tildelt ennå.</div>
      ) : (
        <ul className="release-artist-list">
          {release.editors.map((editor) => (
            <li key={editor.user_id}>
              <div>
                <strong>{editor.display_name ?? editor.user_id}</strong>
                <span>Kan redigere denne utgivelsen</span>
              </div>
              <button
                className="button button--danger-quiet button--small"
                disabled={remove.isPending}
                onClick={() => remove.mutate(editor.user_id)}
                type="button"
              >
                Fjern tildeling
              </button>
            </li>
          ))}
        </ul>
      )}
      <Form
        className="release-editor-form"
        method="post"
        onSubmit={handleAssign}
      >
        <div className="form-field">
          <label htmlFor="release-editor">Tildel til</label>
          <select
            disabled={members.isPending || available.length === 0}
            id="release-editor"
            name="user_id"
            required
          >
            <option value="">
              {members.isPending
                ? 'Henter teamet …'
                : available.length === 0
                  ? 'Ingen flere teammedlemmer tilgjengelig'
                  : 'Velg teammedlem'}
            </option>
            {available.map((candidate) => (
              <option key={candidate.userId} value={candidate.userId}>
                {candidate.displayName
                  ? `${candidate.displayName} (${candidate.email})`
                  : candidate.email}
              </option>
            ))}
          </select>
        </div>
        <div className="resource-form-actions">
          <SubmitButton
            disabled={members.isPending || available.length === 0}
            pending={assign.isPending}
            pendingLabel="Tildeler …"
          >
            Tildel utgivelsen
          </SubmitButton>
        </div>
      </Form>
    </section>
  )
}
