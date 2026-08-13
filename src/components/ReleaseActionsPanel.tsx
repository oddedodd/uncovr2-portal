import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Form, useNavigate } from 'react-router'
import { formError, validationMessages } from '../features/auth/validation.ts'
import {
  archiveRelease,
  decideRelease,
  deleteRelease,
  isEditableReleaseStatus,
  mergeReleaseDetail,
  publishRelease,
  releaseKeys,
  scheduleRelease,
  submitRelease,
  unpublishRelease,
  type Release,
} from '../lib/releases.ts'
import { FeedbackBanner } from './FeedbackBanner.tsx'
import { SubmitButton } from './SubmitButton.tsx'

/**
 * Laravel avviser ugyldige overganger med 422 selv når rettigheten er på plass.
 * Den generiske toppmeldingen sier ingenting, så feltmeldingene vises i stedet
 * — det er de som forteller at et omslag mangler eller at godkjenningen er
 * utdatert.
 */
function actionError(error: unknown) {
  const messages = validationMessages(error)
  return messages.length > 0 ? messages.join(' ') : formError(error)
}

export function ReleaseActionsPanel({ release }: { release: Release }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { permissions, status } = release
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: releaseKeys.detail(release.id),
      }),
      queryClient.invalidateQueries({ queryKey: releaseKeys.lists() }),
    ])
  }
  const store = async (updated: Release) => {
    queryClient.setQueryData(
      releaseKeys.detail(updated.id),
      mergeReleaseDetail(updated),
    )
    await queryClient.invalidateQueries({ queryKey: releaseKeys.lists() })
  }
  const submit = useMutation({
    mutationFn: () => submitRelease(release.id),
    onSuccess: refresh,
  })
  const decide = useMutation({
    mutationFn: (approve: boolean) => decideRelease(release.id, approve),
    onSuccess: store,
  })
  const schedule = useMutation({
    mutationFn: (publishAt: string) => scheduleRelease(release.id, publishAt),
    onSuccess: store,
  })
  const publish = useMutation({
    mutationFn: () => publishRelease(release.id),
    onSuccess: store,
  })
  const unpublish = useMutation({
    mutationFn: () => unpublishRelease(release.id),
    onSuccess: store,
  })
  const archive = useMutation({
    mutationFn: () => archiveRelease(release.id),
    onSuccess: store,
  })
  const remove = useMutation({
    mutationFn: () => deleteRelease(release.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: releaseKeys.lists() })
      queryClient.removeQueries({ queryKey: releaseKeys.detail(release.id) })
      await navigate('/releases')
    },
  })

  // Flaggene avgjør om brukeren har lov. Statusen avgjør om handlingen i det
  // hele tatt finnes her: en «Publiser»-knapp på et utkast ville vært en
  // garantert 422.
  const editable = isEditableReleaseStatus(status)
  const approved = Boolean(release.lifecycle?.approved_at)
  const showsSubmit = permissions.can_submit && editable
  const showsDecision = permissions.can_approve && status === 'review'
  const showsSchedule =
    permissions.can_publish && status === 'review' && approved
  const showsPublish =
    permissions.can_publish &&
    (status === 'scheduled' || (status === 'review' && approved))
  const showsUnpublish = permissions.can_publish && status === 'published'
  const showsArchive = permissions.can_publish && editable
  const showsDelete = permissions.can_delete
  const busy =
    submit.isPending ||
    decide.isPending ||
    schedule.isPending ||
    publish.isPending ||
    unpublish.isPending ||
    archive.isPending ||
    remove.isPending
  const failure =
    submit.error ??
    decide.error ??
    schedule.error ??
    publish.error ??
    unpublish.error ??
    archive.error ??
    remove.error

  if (
    !showsSubmit &&
    !showsDecision &&
    !showsSchedule &&
    !showsPublish &&
    !showsUnpublish &&
    !showsArchive &&
    !showsDelete
  ) {
    return null
  }

  function handleSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const publishAt = String(data.get('publish_at') ?? '')
    if (publishAt) schedule.mutate(new Date(publishAt).toISOString())
  }

  return (
    <section
      className="settings-card"
      aria-labelledby="release-actions-heading"
    >
      <div className="settings-card__heading">
        <h2 id="release-actions-heading">Livsløp</h2>
        <p>
          Handlingene under er de Laravel gir deg tilgang til for denne
          utgivelsen i nåværende status.
        </p>
      </div>
      {failure ? (
        <FeedbackBanner title="Handlingen kunne ikke fullføres" tone="error">
          {actionError(failure)}
        </FeedbackBanner>
      ) : null}
      {submit.isSuccess ? (
        <FeedbackBanner title="Sendt til godkjenning" tone="success">
          Utgivelsen venter nå på en beslutning.
        </FeedbackBanner>
      ) : null}
      <div className="release-actions">
        {showsSubmit ? (
          <button
            className="button button--primary"
            disabled={busy}
            onClick={() => submit.mutate()}
            type="button"
          >
            Send til godkjenning
          </button>
        ) : null}
        {showsDecision ? (
          <>
            <button
              className="button button--primary"
              disabled={busy}
              onClick={() => decide.mutate(true)}
              type="button"
            >
              Godkjenn
            </button>
            <button
              className="button button--secondary"
              disabled={busy}
              onClick={() => decide.mutate(false)}
              type="button"
            >
              Avvis
            </button>
          </>
        ) : null}
        {showsPublish ? (
          <button
            className="button button--primary"
            disabled={busy}
            onClick={() => publish.mutate()}
            type="button"
          >
            Publiser nå
          </button>
        ) : null}
        {showsUnpublish ? (
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => unpublish.mutate()}
            type="button"
          >
            Avpubliser
          </button>
        ) : null}
        {showsArchive ? (
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => archive.mutate()}
            type="button"
          >
            Arkiver
          </button>
        ) : null}
        {showsDelete ? (
          <button
            className="button button--danger-quiet"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
            type="button"
          >
            Slett utgivelse
          </button>
        ) : null}
      </div>
      {showsSchedule ? (
        <Form
          className="release-schedule-form"
          method="post"
          onSubmit={handleSchedule}
        >
          <div className="form-field">
            <label htmlFor="release-publish-at">Planlagt publisering</label>
            <input
              id="release-publish-at"
              name="publish_at"
              required
              type="datetime-local"
            />
          </div>
          <div className="resource-form-actions">
            <SubmitButton
              disabled={busy}
              pending={schedule.isPending}
              pendingLabel="Planlegger …"
            >
              Planlegg
            </SubmitButton>
          </div>
        </Form>
      ) : null}
      {confirmingDelete ? (
        <section className="confirmation-panel confirmation-panel--danger">
          <div>
            <h2>Slett {release.title}?</h2>
            <p>Utgivelsen og innholdet i den fjernes permanent.</p>
          </div>
          <div className="confirmation-panel__actions">
            <button
              className="button button--secondary"
              onClick={() => setConfirmingDelete(false)}
              type="button"
            >
              Avbryt
            </button>
            <button
              className="button button--danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
              type="button"
            >
              {remove.isPending ? 'Sletter …' : 'Bekreft sletting'}
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
