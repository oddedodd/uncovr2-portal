import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Form, Link, useOutletContext, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { ImageUploadField } from '../components/ImageUploadField.tsx'
import { ReleaseActionsPanel } from '../components/ReleaseActionsPanel.tsx'
import { ReleaseEditNotice } from '../components/ReleaseEditNotice.tsx'
import { ReleaseEditorsPanel } from '../components/ReleaseEditorsPanel.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import {
  actionError,
  fieldError,
  formError,
} from '../features/auth/validation.ts'

import type { PortalOutletContext } from '../lib/portal.ts'
import {
  addReleaseArtist,
  deleteReleasePage,
  findCachedReleaseSummary,
  isEditableReleaseStatus,
  mergeReleaseDetail,
  releaseKeys,
  releaseStatusLabel,
  removeReleaseArtist,
  reorderReleasePages,
  updateRelease,
  updateReleaseCover,
  type Release,
  type ReleaseArtistInput,
  type ReleaseMetadataInput,
} from '../lib/releases.ts'
import {
  artistListQueryOptions,
  releaseDetailQueryOptions,
} from '../lib/queryOptions.ts'

function optionalString(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? '').trim()
  return value || null
}

export function ReleaseDetailPage() {
  const { releaseId = '' } = useParams()
  const { workspace } = useOutletContext<PortalOutletContext>()
  const queryClient = useQueryClient()
  const [confirmingPageDelete, setConfirmingPageDelete] = useState<
    string | null
  >(null)
  const release = useQuery({
    ...releaseDetailQueryOptions(releaseId),
    enabled: Boolean(releaseId),
    // Kom brukeren hit fra listen, ligger sammendraget allerede i cachen.
    // Toppen males da med én gang, mens resten venter på detaljsvaret.
    placeholderData: () => findCachedReleaseSummary(queryClient, releaseId),
  })
  const metadata = useMutation({
    mutationFn: (input: ReleaseMetadataInput) =>
      updateRelease(releaseId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        releaseKeys.detail(updated.id),
        mergeReleaseDetail(updated),
      )
      await queryClient.invalidateQueries({ queryKey: releaseKeys.lists() })
    },
  })
  const artists = useQuery({
    ...artistListQueryOptions(),
    // Artistlista har ingen dataavhengighet til releasen, så den skal ikke
    // vente på den.
    enabled: Boolean(workspace),
  })
  // Artistkoblinger vises også i listeradene, så begge må invalideres.
  const addArtist = useMutation({
    mutationFn: (input: ReleaseArtistInput) =>
      addReleaseArtist(releaseId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.lists() }),
      ])
    },
  })
  const removeArtist = useMutation({
    mutationFn: (artistId: string) => removeReleaseArtist(releaseId, artistId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.lists() }),
      ])
    },
  })
  // Sider vises aldri i listevisningen, så kun detaljen trenger å hentes på
  // nytt. Selve sideinnholdet redigeres på `/releases/:releaseId/pages/:pageId`
  // — her styres bare rekkefølgen og hvilke sider som finnes.
  const reorderPages = useMutation({
    mutationFn: (pageIds: string[]) => reorderReleasePages(releaseId, pageIds),
    // Svaret er hele lista renummerert 1..n, så den skrives rett inn i cachen.
    // En refetch her ville bare bekreftet det vi allerede vet, og lista ville
    // hoppet i mellomtiden.
    onSuccess: (pages) => {
      queryClient.setQueryData<Release>(
        releaseKeys.detail(releaseId),
        (previous) => (previous ? { ...previous, pages } : previous),
      )
    },
    onError: async (error) => {
      // Laravel krever en eksakt permutasjon. En 422 på `page_ids` betyr at
      // lista vår er utdatert — da er riktig svar å hente den på nytt.
      if (fieldError(error, 'page_ids')) {
        await queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        })
      }
    },
  })
  const deletePage = useMutation({
    mutationFn: deleteReleasePage,
    onSuccess: async () => {
      setConfirmingPageDelete(null)
      await queryClient.invalidateQueries({
        queryKey: releaseKeys.detail(releaseId),
      })
    },
  })

  if (release.isPending) return <p aria-live="polite">Henter utgivelsen …</p>
  // Releasen og arbeidsområdene hentes parallelt. Uten denne kan et raskt
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
  // Sammendraget fra listen mangler beskrivelse, UPC og sider. Skjemaene under
  // er ukontrollerte, så en defaultValue satt fra en placeholder ville ikke
  // blitt oppdatert når detaljsvaret lander. Derfor vises de først da.
  const showsDetail = !release.isPlaceholderData
  // Rettighetene kommer fra Laravel per utgivelse og utledes aldri fra rolle
  // eller redaktørlista her. Statusen brukes bare til å forklare et nei.
  const permissions = current.permissions
  const canManage = permissions.can_update
  const editableStatus = isEditableReleaseStatus(current.status)

  async function attach(coverMediaId: string | null) {
    const updated = await updateReleaseCover(current.id, coverMediaId)
    queryClient.setQueryData(
      releaseKeys.detail(current.id),
      mergeReleaseDetail(updated),
    )
    await queryClient.invalidateQueries({ queryKey: releaseKeys.lists() })
  }

  function handleMetadataSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    metadata.mutate({
      type: String(data.get('type') ?? current.type) as
        | 'album'
        | 'ep'
        | 'single',
      title: String(data.get('title') ?? '').trim(),
      subtitle: optionalString(data, 'subtitle'),
      description: optionalString(data, 'description'),
      release_date: optionalString(data, 'release_date'),
      upc: optionalString(data, 'upc'),
    })
  }

  function handleArtistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    addArtist.mutate({
      artist_id: String(data.get('artist_id') ?? ''),
      is_primary: data.get('is_primary') === 'on',
      position: Number(data.get('position') ?? current.artists.length + 1),
    })
  }

  const linkedArtistIds = new Set(
    current.artists.map((artist) => artist.artist_id),
  )
  const availableArtists =
    artists.data?.data.filter((artist) => !linkedArtistIds.has(artist.id)) ?? []
  const nextPosition =
    Math.max(0, ...current.artists.map((artist) => artist.position)) + 1
  const sortedReleaseArtists = [...current.artists].sort(
    (first, second) => first.position - second.position,
  )
  const sortedReleasePages = [...(current.pages ?? [])].sort(
    (first, second) => first.position - second.position,
  )
  // En flytting eller sletting endrer posisjonene til flere sider på én gang.
  // Knappene låses derfor samlet til svaret har landet, slik at neste klikk
  // regner på den rekkefølgen Laravel faktisk har.
  const pagesBusy = reorderPages.isPending || deletePage.isPending

  // Hele rekkefølgen sendes hver gang. Det er den samme forespørselen drag and
  // drop vil lage — bare med en annen måte å komme fram til lista på.
  function movePage(index: number, direction: -1 | 1) {
    const pageIds = sortedReleasePages.map((page) => page.id)
    const target = index + direction
    ;[pageIds[index], pageIds[target]] = [pageIds[target], pageIds[index]]
    reorderPages.mutate(pageIds)
  }

  return (
    <div className="resource-form-page">
      <div>
        <p className="eyebrow">{workspace.name} · Utgivelse</p>
        <div className="resource-title-row">
          <div>
            <h1 className="page-title">{current.title}</h1>
            <p className="page-intro">
              {current.artists.map((artist) => artist.name).join(', ') ||
                'Ingen artist koblet til'}
            </p>
          </div>
          <span className={`status-pill status-pill--${current.status}`}>
            {releaseStatusLabel(current.status)}
          </span>
        </div>
      </div>
      <ReleaseEditNotice release={current} />
      {showsDetail ? (
        <>
          <section
            className="settings-card"
            aria-labelledby="release-cover-heading"
          >
            <div className="settings-card__heading">
              <h2 id="release-cover-heading">Albumomslag</h2>
              <p>
                {editableStatus
                  ? 'Legg til eller bytt omslag før utgivelsen publiseres.'
                  : 'Publiserte utgivelser må avpubliseres før omslaget kan endres.'}
              </p>
            </div>
            <ImageUploadField
              canManage={canManage}
              description="Et kvadratisk bilde i høy oppløsning anbefales. JPEG, PNG, WebP eller AVIF."
              label="Albumomslag"
              media={current.cover_media}
              ownerId={current.owner.id}
              ownerType={current.owner.type}
              variant="cover"
              onAttach={attach}
            />
          </section>
          <section
            className="settings-card"
            aria-labelledby="release-artists-heading"
          >
            <div className="settings-card__heading">
              <h2 id="release-artists-heading">Artister</h2>
              <p>
                {canManage
                  ? 'Koble artister til utgivelsen og velg hvem som er primærartist.'
                  : 'Artistlisten viser hvem som er koblet til utgivelsen.'}
              </p>
            </div>
            {addArtist.isError ? (
              <FeedbackBanner title="Kunne ikke legge til artist" tone="error">
                {formError(addArtist.error)}
              </FeedbackBanner>
            ) : null}
            {removeArtist.isError ? (
              <FeedbackBanner title="Kunne ikke fjerne artist" tone="error">
                {formError(removeArtist.error)}
              </FeedbackBanner>
            ) : null}
            <ul className="release-artist-list">
              {sortedReleaseArtists.map((artist) => (
                <li key={artist.artist_id}>
                  <div>
                    <strong>{artist.name}</strong>
                    <span>
                      {artist.is_primary
                        ? 'Primærartist'
                        : 'Medvirkende artist'}{' '}
                      · Posisjon {artist.position}
                    </span>
                  </div>
                  {canManage && !artist.is_primary ? (
                    <button
                      className="button button--secondary button--small"
                      disabled={removeArtist.isPending}
                      onClick={() => removeArtist.mutate(artist.artist_id)}
                      type="button"
                    >
                      Fjern
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {canManage ? (
              <Form
                className="release-artist-form"
                method="post"
                onSubmit={handleArtistSubmit}
              >
                <div className="form-field">
                  <label htmlFor="release-artist">Legg til artist</label>
                  <select
                    disabled={
                      artists.isPending || availableArtists.length === 0
                    }
                    id="release-artist"
                    name="artist_id"
                    required
                  >
                    <option value="">
                      {artists.isPending
                        ? 'Henter artister …'
                        : availableArtists.length === 0
                          ? 'Ingen flere artister tilgjengelig'
                          : 'Velg artist'}
                    </option>
                    {availableArtists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.profile.name}
                      </option>
                    ))}
                  </select>
                  {fieldError(addArtist.error, 'artist_id') ? (
                    <span className="field-error" role="alert">
                      {fieldError(addArtist.error, 'artist_id')}
                    </span>
                  ) : null}
                </div>
                <FormField
                  defaultValue={nextPosition}
                  error={fieldError(addArtist.error, 'position')}
                  label="Posisjon"
                  min={1}
                  name="position"
                  required
                  type="number"
                />
                <label className="checkbox-field">
                  <input name="is_primary" type="checkbox" />
                  <span>Gjør til primærartist</span>
                </label>
                <div className="resource-form-actions">
                  <SubmitButton
                    disabled={
                      artists.isPending || availableArtists.length === 0
                    }
                    pending={addArtist.isPending}
                    pendingLabel="Legger til …"
                  >
                    Legg til artist
                  </SubmitButton>
                </div>
              </Form>
            ) : null}
          </section>
          {permissions.can_manage_editors ? (
            <ReleaseEditorsPanel release={current} />
          ) : null}
          <section
            className="settings-card"
            aria-labelledby="release-pages-heading"
          >
            <div className="settings-card__heading">
              <h2 id="release-pages-heading">Sider</h2>
              <p>
                {canManage
                  ? 'Sidene vises i denne rekkefølgen i det digitale platecoveret. Innholdet redigeres på hver enkelt side.'
                  : 'Sider kan endres på redigerbare utgivelser du har tilgang til.'}
              </p>
            </div>
            {reorderPages.isError ? (
              <FeedbackBanner title="Kunne ikke endre rekkefølgen" tone="error">
                {fieldError(reorderPages.error, 'page_ids')
                  ? 'Sidene ble endret et annet sted mens du jobbet. Lista er hentet på nytt — prøv flyttingen på nytt.'
                  : actionError(reorderPages.error)}
              </FeedbackBanner>
            ) : null}
            {deletePage.isError ? (
              <FeedbackBanner title="Kunne ikke fjerne side" tone="error">
                {actionError(deletePage.error)}
              </FeedbackBanner>
            ) : null}
            {sortedReleasePages.length === 0 ? (
              <div className="inline-empty">Ingen sider ennå.</div>
            ) : (
              <ol className="page-list">
                {sortedReleasePages.map((page, index) => {
                  const title = page.title ?? 'Uten tittel'
                  const blockCount = (page.blocks ?? []).length

                  return (
                    <li key={page.id}>
                      <div className="order-row">
                        <div className="order-row__summary">
                          <strong>
                            {index + 1}. {title}
                          </strong>
                          <span>
                            {blockCount === 1
                              ? '1 blokk'
                              : `${blockCount} blokker`}
                          </span>
                        </div>
                        <div className="order-row__actions">
                          {canManage ? (
                            <>
                              <button
                                aria-label={`Flytt opp: ${title}`}
                                className="button button--secondary button--small"
                                disabled={index === 0 || pagesBusy}
                                onClick={() => movePage(index, -1)}
                                type="button"
                              >
                                Flytt opp
                              </button>
                              <button
                                aria-label={`Flytt ned: ${title}`}
                                className="button button--secondary button--small"
                                disabled={
                                  index === sortedReleasePages.length - 1 ||
                                  pagesBusy
                                }
                                onClick={() => movePage(index, 1)}
                                type="button"
                              >
                                Flytt ned
                              </button>
                            </>
                          ) : null}
                          <Link
                            aria-label={`${canManage ? 'Rediger' : 'Åpne'} side: ${title}`}
                            className="button button--secondary button--small"
                            to={`/releases/${current.id}/pages/${page.id}`}
                          >
                            {canManage ? 'Rediger side' : 'Åpne side'}
                          </Link>
                          {canManage ? (
                            <button
                              aria-label={`Fjern side: ${title}`}
                              className="button button--danger-quiet button--small"
                              disabled={pagesBusy}
                              onClick={() => setConfirmingPageDelete(page.id)}
                              type="button"
                            >
                              Fjern side
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {confirmingPageDelete === page.id ? (
                        <div className="confirmation-panel confirmation-panel--danger">
                          <div>
                            <h3>Fjern {title}?</h3>
                            <p>
                              Siden og alle blokkene på den slettes permanent.
                              Dette kan ikke angres.
                            </p>
                          </div>
                          <div className="confirmation-panel__actions">
                            <button
                              className="button button--secondary"
                              onClick={() => setConfirmingPageDelete(null)}
                              type="button"
                            >
                              Avbryt
                            </button>
                            <button
                              className="button button--danger"
                              disabled={deletePage.isPending}
                              onClick={() => deletePage.mutate(page.id)}
                              type="button"
                            >
                              {deletePage.isPending
                                ? 'Sletter …'
                                : 'Bekreft sletting'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            )}
            {canManage ? (
              <div className="resource-form-actions">
                <Link
                  className="button button--primary"
                  to={`/releases/${current.id}/pages/new`}
                >
                  Ny side
                </Link>
              </div>
            ) : null}
          </section>
          <section
            className="settings-card"
            aria-labelledby="release-details-heading"
          >
            <div className="settings-card__heading">
              <h2 id="release-details-heading">Utgivelsesinformasjon</h2>
              <p>
                {canManage
                  ? 'Oppdater grunnleggende metadata mens utgivelsen er redigerbar.'
                  : 'Grunnleggende metadata kan bare endres for redigerbare utgivelser du har tilgang til.'}
              </p>
            </div>
            {metadata.isError ? (
              <FeedbackBanner title="Kunne ikke lagre utgivelsen" tone="error">
                {formError(metadata.error)}
              </FeedbackBanner>
            ) : null}
            {metadata.isSuccess ? (
              <FeedbackBanner title="Utgivelsen er lagret" tone="success">
                Metadata ble oppdatert.
              </FeedbackBanner>
            ) : null}
            {canManage ? (
              <Form
                className="form-stack"
                method="post"
                onSubmit={handleMetadataSubmit}
              >
                <div className="form-field">
                  <label htmlFor="release-type">Type</label>
                  <select
                    defaultValue={current.type}
                    id="release-type"
                    name="type"
                  >
                    <option value="single">Single</option>
                    <option value="ep">EP</option>
                    <option value="album">Album</option>
                  </select>
                </div>
                <FormField
                  defaultValue={current.title}
                  error={fieldError(metadata.error, 'title')}
                  label="Tittel"
                  maxLength={200}
                  name="title"
                  required
                />
                <FormField
                  defaultValue={current.subtitle ?? ''}
                  error={fieldError(metadata.error, 'subtitle')}
                  label="Undertittel"
                  maxLength={200}
                  name="subtitle"
                />
                <div className="form-field">
                  <label htmlFor="release-description">Beskrivelse</label>
                  <textarea
                    aria-describedby={
                      fieldError(metadata.error, 'description')
                        ? 'release-description-error'
                        : undefined
                    }
                    aria-invalid={
                      fieldError(metadata.error, 'description')
                        ? true
                        : undefined
                    }
                    defaultValue={current.description ?? ''}
                    id="release-description"
                    maxLength={10000}
                    name="description"
                    rows={6}
                  />
                  {fieldError(metadata.error, 'description') ? (
                    <span
                      className="field-error"
                      id="release-description-error"
                      role="alert"
                    >
                      {fieldError(metadata.error, 'description')}
                    </span>
                  ) : null}
                </div>
                <FormField
                  defaultValue={current.release_date ?? ''}
                  error={fieldError(metadata.error, 'release_date')}
                  label="Utgivelsesdato"
                  name="release_date"
                  type="date"
                />
                <FormField
                  defaultValue={current.upc ?? ''}
                  error={fieldError(metadata.error, 'upc')}
                  inputMode="numeric"
                  label="UPC"
                  maxLength={14}
                  name="upc"
                  pattern="[0-9]{12,14}"
                />
                <div className="resource-form-actions">
                  <SubmitButton
                    pending={metadata.isPending}
                    pendingLabel="Lagrer …"
                  >
                    Lagre metadata
                  </SubmitButton>
                </div>
              </Form>
            ) : (
              <dl className="profile-details">
                <div>
                  <dt>Type</dt>
                  <dd>{current.type}</dd>
                </div>
                <div>
                  <dt>Utgivelsesdato</dt>
                  <dd>{current.release_date ?? 'Ikke satt'}</dd>
                </div>
                <div>
                  <dt>UPC</dt>
                  <dd>{current.upc ?? 'Ikke satt'}</dd>
                </div>
                <div>
                  <dt>Offentlig ID</dt>
                  <dd>{current.id}</dd>
                </div>
              </dl>
            )}
          </section>
          <ReleaseActionsPanel release={current} />
        </>
      ) : (
        <p aria-live="polite">Henter utgivelsen …</p>
      )}
      <Link className="resource-back-link" to="/releases">
        Tilbake til alle utgivelser
      </Link>
    </div>
  )
}
