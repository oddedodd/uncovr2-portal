import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { ReleaseEditNotice } from '../components/ReleaseEditNotice.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { releaseDetailQueryOptions } from '../lib/queryOptions.ts'
import {
  createReleasePage,
  releaseKeys,
  type ReleasePageInput,
} from '../lib/releases.ts'

export function CreateReleaseContentPage() {
  const { releaseId = '' } = useParams()
  const { workspace } = useOutletContext<PortalOutletContext>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const release = useQuery({
    ...releaseDetailQueryOptions(releaseId),
    enabled: Boolean(releaseId),
  })
  const create = useMutation({
    mutationFn: (input: ReleasePageInput) =>
      createReleasePage(releaseId, input),
    onSuccess: async (page) => {
      await queryClient.invalidateQueries({
        queryKey: releaseKeys.detail(releaseId),
      })
      // Siden er tom når den opprettes, så brukeren skal rett videre til
      // blokkene i stedet for tilbake til utgivelsen.
      await navigate(`/releases/${releaseId}/pages/${page.id}`)
    },
  })

  if (release.isPending) return <p aria-live="polite">Henter utgivelsen …</p>
  if (!workspace) return null
  if (release.isError || !release.data) {
    return (
      <FeedbackBanner title="Kunne ikke hente utgivelsen" tone="error">
        {formError(release.error)}
      </FeedbackBanner>
    )
  }

  const current = release.data
  const canManage = current.permissions.can_update
  // Opprettelse forskyver ikke: en opptatt posisjon gir 422. Sletting
  // renummererer heller ikke, så posisjonene kan ha hull — antallet sider er
  // derfor feil svar. Den nye siden legges bakerst etter den høyeste.
  const nextPosition =
    Math.max(0, ...(current.pages ?? []).map((page) => page.position)) + 1

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    create.mutate({ position: nextPosition, title: title || null })
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">
          {workspace.name} · {current.title}
        </p>
        <h1 className="page-title">Ny side</h1>
        <p className="page-intro">
          Siden legges bakerst i det digitale platecoveret. Innholdet bygges med
          blokker på neste steg.
        </p>
      </div>
      <ReleaseEditNotice release={current} />
      {create.isError ? (
        <FeedbackBanner title="Kunne ikke opprette side" tone="error">
          {formError(create.error)}
        </FeedbackBanner>
      ) : null}
      {canManage ? (
        <Form
          className="settings-card form-stack"
          method="post"
          onSubmit={handleSubmit}
        >
          <FormField
            error={fieldError(create.error, 'title')}
            hint="Kan stå tom. Du kan gi siden en tittel senere."
            label="Sidetittel"
            maxLength={200}
            name="title"
          />
          <div className="resource-form-actions">
            <Link
              className="button button--secondary"
              to={`/releases/${releaseId}`}
            >
              Avbryt
            </Link>
            <SubmitButton pending={create.isPending} pendingLabel="Oppretter …">
              Opprett side
            </SubmitButton>
          </div>
        </Form>
      ) : null}
      <Link className="resource-back-link" to={`/releases/${releaseId}`}>
        Tilbake til utgivelsen
      </Link>
    </div>
  )
}
