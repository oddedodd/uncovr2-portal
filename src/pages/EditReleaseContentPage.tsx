import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Link, useOutletContext, useParams } from 'react-router'
import { ContentBlockForm } from '../components/ContentBlockForm.tsx'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { ReleaseEditNotice } from '../components/ReleaseEditNotice.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import {
  actionError,
  fieldError,
  formError,
} from '../features/auth/validation.ts'
import { blockTextValue, blockTypeLabels } from '../lib/contentBlocks.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { releaseDetailQueryOptions } from '../lib/queryOptions.ts'
import {
  createContentBlock,
  deleteContentBlock,
  releaseKeys,
  reorderPageBlocks,
  updateContentBlock,
  updateReleasePage,
  type Release,
  type ReleaseContentBlockInput,
  type ReleasePageInput,
} from '../lib/releases.ts'

/**
 * Siden lever i utgivelsens detaljsvar, ikke bak et eget endepunkt. Ruten leser
 * derfor den samme queryen som utgivelsessiden: kommer brukeren derfra ligger
 * sidene allerede i cachen, og skrivinger invalideres ett sted.
 */
export function EditReleaseContentPage() {
  const { releaseId = '', pageId = '' } = useParams()
  const { workspace } = useOutletContext<PortalOutletContext>()
  const queryClient = useQueryClient()
  const release = useQuery({
    ...releaseDetailQueryOptions(releaseId),
    enabled: Boolean(releaseId),
  })
  const refreshRelease = () =>
    queryClient.invalidateQueries({ queryKey: releaseKeys.detail(releaseId) })
  const updatePage = useMutation({
    mutationFn: (input: Partial<ReleasePageInput>) =>
      updateReleasePage(pageId, input),
    onSuccess: refreshRelease,
  })
  const createBlock = useMutation({
    mutationFn: (input: ReleaseContentBlockInput) =>
      createContentBlock(pageId, input),
    onSuccess: refreshRelease,
  })
  const updateBlock = useMutation({
    mutationFn: ({
      blockId,
      input,
    }: {
      blockId: string
      input: Partial<ReleaseContentBlockInput>
    }) => updateContentBlock(pageId, blockId, input),
    onSuccess: refreshRelease,
  })
  const deleteBlock = useMutation({
    mutationFn: (blockId: string) => deleteContentBlock(pageId, blockId),
    onSuccess: refreshRelease,
  })
  const reorderBlocks = useMutation({
    mutationFn: (blockIds: string[]) => reorderPageBlocks(pageId, blockIds),
    // Svaret er sidens blokker renummerert 1..n. En omrokering rører verken
    // `version` eller innhold, så det kan skrives rett inn i cachen.
    onSuccess: (blocks) => {
      queryClient.setQueryData<Release>(
        releaseKeys.detail(releaseId),
        (previous) =>
          previous
            ? {
                ...previous,
                pages: (previous.pages ?? []).map((candidate) =>
                  candidate.id === pageId
                    ? { ...candidate, blocks }
                    : candidate,
                ),
              }
            : previous,
      )
    },
    onError: async (error) => {
      // Laravel krever en eksakt permutasjon. 422 på `block_ids` betyr at lista
      // vår er utdatert, ikke at brukeren gjorde noe feil.
      if (fieldError(error, 'block_ids')) await refreshRelease()
    },
  })

  if (release.isPending) return <p aria-live="polite">Henter siden …</p>
  // Utgivelsen og arbeidsområdene hentes parallelt. Uten denne kan et raskt
  // release-svar rekke å rendre feilbanneret før arbeidsområdene har landet.
  if (!workspace) return null
  if (release.isError || !release.data) {
    return (
      <FeedbackBanner title="Kunne ikke hente utgivelsen" tone="error">
        {formError(release.error)}
      </FeedbackBanner>
    )
  }

  const current = release.data
  const page = (current.pages ?? []).find(
    (candidate) => candidate.id === pageId,
  )

  if (!page) {
    return (
      <div className="resource-form-page">
        <FeedbackBanner title="Fant ikke siden" tone="error">
          Siden finnes ikke i denne utgivelsen. Den kan ha blitt fjernet.
        </FeedbackBanner>
        <Link className="resource-back-link" to={`/releases/${releaseId}`}>
          Tilbake til utgivelsen
        </Link>
      </div>
    )
  }

  const canManage = current.permissions.can_update
  const blocks = [...(page.blocks ?? [])].sort(
    (first, second) => first.position - second.position,
  )
  // En ny blokk på en opptatt posisjon avvises med 422, og posisjonene kan ha
  // hull etter tidligere slettinger. Forslaget må derfor bygge på den høyeste
  // posisjonen, ikke på antallet blokker.
  const nextBlockPosition =
    Math.max(0, ...blocks.map((block) => block.position)) + 1
  // En flytting renummererer flere blokker samtidig, så knappene låses samlet
  // til svaret har landet.
  const blocksBusy =
    updateBlock.isPending || deleteBlock.isPending || reorderBlocks.isPending

  // Hele rekkefølgen sendes hver gang — samme forespørsel som en senere drag
  // and drop vil lage.
  function moveBlock(index: number, direction: -1 | 1) {
    const blockIds = blocks.map((block) => block.id)
    const target = index + direction
    ;[blockIds[index], blockIds[target]] = [blockIds[target], blockIds[index]]
    reorderBlocks.mutate(blockIds)
  }

  function handleBlockUpdate(
    blockId: string,
    input: Pick<ReleaseContentBlockInput, 'type' | 'payload'>,
  ) {
    // Posisjonen sendes bevisst ikke: en PATCH med `position` går gjennom
    // innholdsløypa i Laravel og legger igjen et versjonssnapshot uten at noe
    // innhold er endret.
    updateBlock.mutate({ blockId, input })
  }

  function handleTitleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    updatePage.mutate({ title: title || null })
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">
          {workspace.name} · {current.title}
        </p>
        <h1 className="page-title">{page.title ?? 'Uten tittel'}</h1>
        <p className="page-intro">
          Side {page.position} i det digitale platecoveret. Rekkefølgen endres
          på utgivelsen.
        </p>
      </div>
      <ReleaseEditNotice release={current} />
      <section className="settings-card" aria-labelledby="page-details-heading">
        <div className="settings-card__heading">
          <h2 id="page-details-heading">Om siden</h2>
          <p>
            {canManage
              ? 'Tittelen vises i innholdsfortegnelsen på utgivelsen.'
              : 'Tittelen kan endres på redigerbare utgivelser du har tilgang til.'}
          </p>
        </div>
        {updatePage.isError ? (
          <FeedbackBanner title="Kunne ikke lagre siden" tone="error">
            {formError(updatePage.error)}
          </FeedbackBanner>
        ) : null}
        {updatePage.isSuccess ? (
          <FeedbackBanner title="Siden er lagret" tone="success">
            Sidetittelen ble oppdatert.
          </FeedbackBanner>
        ) : null}
        {canManage ? (
          <Form
            className="form-stack"
            method="post"
            onSubmit={handleTitleSubmit}
          >
            <FormField
              defaultValue={page.title ?? ''}
              error={fieldError(updatePage.error, 'title')}
              label="Sidetittel"
              maxLength={200}
              name="title"
            />
            <div className="resource-form-actions">
              <SubmitButton
                pending={updatePage.isPending}
                pendingLabel="Lagrer …"
              >
                Lagre side
              </SubmitButton>
            </div>
          </Form>
        ) : null}
      </section>
      <section className="settings-card" aria-labelledby="page-blocks-heading">
        <div className="settings-card__heading">
          <h2 id="page-blocks-heading">Blokker</h2>
          <p>
            {canManage
              ? 'Bygg innholdet på siden med tekst, media og sitater.'
              : 'Blokkene viser innholdet på siden.'}
          </p>
        </div>
        {createBlock.isError ? (
          <FeedbackBanner title="Kunne ikke legge til blokk" tone="error">
            {formError(createBlock.error)}
          </FeedbackBanner>
        ) : null}
        {updateBlock.isError ? (
          <FeedbackBanner title="Kunne ikke lagre blokk" tone="error">
            {formError(updateBlock.error)}
          </FeedbackBanner>
        ) : null}
        {deleteBlock.isError ? (
          <FeedbackBanner title="Kunne ikke fjerne blokk" tone="error">
            {formError(deleteBlock.error)}
          </FeedbackBanner>
        ) : null}
        {reorderBlocks.isError ? (
          <FeedbackBanner title="Kunne ikke endre rekkefølgen" tone="error">
            {fieldError(reorderBlocks.error, 'block_ids')
              ? 'Blokkene ble endret et annet sted mens du jobbet. Siden er hentet på nytt — prøv flyttingen på nytt.'
              : actionError(reorderBlocks.error)}
          </FeedbackBanner>
        ) : null}
        {blocks.length === 0 ? (
          <div className="inline-empty">Ingen blokker ennå.</div>
        ) : (
          <ul className="content-block-list">
            {blocks.map((block, index) => (
              <li key={block.id}>
                <div className="order-row">
                  <div className="order-row__summary">
                    <strong>
                      {index + 1}. {blockTypeLabels[block.type]}
                    </strong>
                  </div>
                  {canManage ? (
                    <div className="order-row__actions">
                      <button
                        aria-label={`Flytt opp: blokk ${index + 1}`}
                        className="button button--secondary button--small"
                        disabled={index === 0 || blocksBusy}
                        onClick={() => moveBlock(index, -1)}
                        type="button"
                      >
                        Flytt opp
                      </button>
                      <button
                        aria-label={`Flytt ned: blokk ${index + 1}`}
                        className="button button--secondary button--small"
                        disabled={index === blocks.length - 1 || blocksBusy}
                        onClick={() => moveBlock(index, 1)}
                        type="button"
                      >
                        Flytt ned
                      </button>
                    </div>
                  ) : null}
                </div>
                {canManage ? (
                  <ContentBlockForm
                    block={block}
                    disabled={blocksBusy}
                    ownerId={current.owner.id}
                    ownerType={current.owner.type}
                    pending={updateBlock.isPending}
                    onDelete={() => deleteBlock.mutate(block.id)}
                    onSubmit={(input) => handleBlockUpdate(block.id, input)}
                  />
                ) : (
                  <div className="content-block-preview">
                    <span>{blockTextValue(block)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <ContentBlockForm
            // Skjemaet er ukontrollert. Uten en ny nøkkel etter en lagring blir
            // feltene stående med den forrige blokkens innhold.
            key={nextBlockPosition}
            disabled={createBlock.isPending}
            ownerId={current.owner.id}
            ownerType={current.owner.type}
            pending={createBlock.isPending}
            onSubmit={(input) =>
              createBlock.mutate({ position: nextBlockPosition, ...input })
            }
          />
        ) : null}
      </section>
      <Link className="resource-back-link" to={`/releases/${releaseId}`}>
        Tilbake til utgivelsen
      </Link>
    </div>
  )
}
