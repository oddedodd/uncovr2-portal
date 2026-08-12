import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Form, Link, useOutletContext, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { FormField } from '../components/FormField.tsx'
import { ImageUploadField } from '../components/ImageUploadField.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import { artistKeys, getArtists } from '../lib/artists.ts'
import {
  getMediaDownloadUrls,
  mediaKeys,
  uploadMedia,
  type MediaKind,
  type MediaOwnerType,
} from '../lib/media.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import {
  addReleaseArtist,
  createContentBlock,
  createReleasePage,
  deleteContentBlock,
  deleteReleasePage,
  getRelease,
  releaseKeys,
  removeReleaseArtist,
  updateContentBlock,
  updateReleasePage,
  updateRelease,
  updateReleaseCover,
  type ReleaseContentPage,
  type ReleaseContentBlock,
  type ReleaseContentBlockInput,
  type ReleaseContentBlockPayload,
  type ReleaseContentBlockType,
  type ReleaseArtistInput,
  type ReleaseMetadataInput,
  type ReleasePageInput,
} from '../lib/releases.ts'

function optionalString(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? '').trim()
  return value || null
}

function pagePayload(
  data: FormData,
  fallbackPosition: number,
): ReleasePageInput {
  return {
    position: Number(data.get('position') ?? fallbackPosition),
    title: optionalString(data, 'title'),
  }
}

function blockPayload(type: ReleaseContentBlockType, data: FormData) {
  if (type === 'heading') {
    return {
      text: String(data.get('text') ?? '').trim(),
      level: Number(data.get('level') ?? 2),
    }
  }
  if (type === 'text') {
    return { body: String(data.get('body') ?? '').trim() }
  }
  if (type === 'quote') {
    return {
      text: String(data.get('text') ?? '').trim(),
      attribution: optionalString(data, 'attribution'),
    }
  }
  if (type === 'image') {
    return {
      media_id: String(data.get('media_id') ?? '').trim(),
      alt_text: String(data.get('alt_text') ?? '').trim(),
      caption: optionalString(data, 'caption'),
    }
  }
  if (type === 'gallery') {
    return {
      items: [
        {
          media_id: String(data.get('media_id') ?? '').trim(),
          alt_text: String(data.get('alt_text') ?? '').trim(),
          caption: optionalString(data, 'caption'),
        },
      ],
    }
  }
  if (type === 'video') {
    const mediaId = optionalString(data, 'media_id')
    const url = optionalString(data, 'url')
    return {
      media_id: url ? null : mediaId,
      url: mediaId ? null : url,
      caption: optionalString(data, 'caption'),
    }
  }
  return {
    text: String(data.get('text') ?? '').trim(),
    language: optionalString(data, 'language'),
  }
}

function blockTextValue(block: ReleaseContentBlock) {
  const payload = block.payload
  if ('body' in payload && typeof payload.body === 'string') return payload.body
  if ('text' in payload && typeof payload.text === 'string') return payload.text
  return ''
}

function blockSecondaryValue(block: ReleaseContentBlock, key: string) {
  const value = (block.payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

function blockLevelValue(payload: ReleaseContentBlockPayload) {
  return 'level' in payload && typeof payload.level === 'number'
    ? payload.level
    : 2
}

function blockMediaId(block?: ReleaseContentBlock) {
  const payload = block?.payload
  if (!payload) return ''
  if ('media_id' in payload && typeof payload.media_id === 'string') {
    return payload.media_id
  }
  if ('items' in payload && Array.isArray(payload.items)) {
    const first = payload.items[0] as Record<string, unknown> | undefined
    return typeof first?.media_id === 'string' ? first.media_id : ''
  }
  return ''
}

function blockCaptionValue(block?: ReleaseContentBlock) {
  const payload = block?.payload
  if (!payload) return ''
  if ('caption' in payload && typeof payload.caption === 'string') {
    return payload.caption
  }
  if ('items' in payload && Array.isArray(payload.items)) {
    const first = payload.items[0] as Record<string, unknown> | undefined
    return typeof first?.caption === 'string' ? first.caption : ''
  }
  return ''
}

function blockAltTextValue(block?: ReleaseContentBlock) {
  const payload = block?.payload
  if (!payload) return ''
  if ('alt_text' in payload && typeof payload.alt_text === 'string') {
    return payload.alt_text
  }
  if ('items' in payload && Array.isArray(payload.items)) {
    const first = payload.items[0] as Record<string, unknown> | undefined
    return typeof first?.alt_text === 'string' ? first.alt_text : ''
  }
  return ''
}

function blockVideoUrlValue(block?: ReleaseContentBlock) {
  const payload = block?.payload
  return payload && 'url' in payload && typeof payload.url === 'string'
    ? payload.url
    : ''
}

function mediaKindForBlock(type: ReleaseContentBlockType): MediaKind {
  return type === 'video' ? 'video' : 'image'
}

function ContentBlockForm({
  block,
  defaultPosition = 1,
  disabled,
  ownerId,
  ownerType,
  onDelete,
  onSubmit,
  pending,
}: {
  block?: ReleaseContentBlock
  defaultPosition?: number
  disabled?: boolean
  ownerId: string
  ownerType: MediaOwnerType
  onDelete?: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  pending: boolean
}) {
  const [type, setType] = useState<ReleaseContentBlockType>(
    block?.type ?? 'text',
  )
  const [mediaId, setMediaId] = useState(blockMediaId(block))
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)
  const text = block ? blockTextValue(block) : ''
  const showsMediaFields = ['image', 'gallery', 'video'].includes(type)
  const mediaDownload = useQuery({
    queryKey: mediaKeys.downloads(mediaId ? [mediaId] : []),
    queryFn: () => getMediaDownloadUrls(mediaId ? [mediaId] : []),
    enabled: Boolean(mediaId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const mediaUpload = useMutation({
    mutationFn: (file: File) =>
      uploadMedia(ownerType, ownerId, mediaKindForBlock(type), file),
    onSuccess: (media) => {
      setMediaId(media.id)
      setUploadNotice('Media er lastet opp. Lagre blokken for å bruke den.')
    },
  })
  const mediaUrl = mediaId ? mediaDownload.data?.get(mediaId) : undefined

  return (
    <Form className="content-block-form" method="post" onSubmit={onSubmit}>
      <div className="form-field">
        <label htmlFor={`${block?.id ?? 'new'}-block-type`}>Blokktype</label>
        <select
          id={`${block?.id ?? 'new'}-block-type`}
          name="type"
          onChange={(event) =>
            setType(event.target.value as ReleaseContentBlockType)
          }
          value={type}
        >
          <option value="text">Tekst</option>
          <option value="heading">Overskrift</option>
          <option value="image">Bilde</option>
          <option value="gallery">Galleri</option>
          <option value="video">Video</option>
          <option value="quote">Sitat</option>
          <option value="lyrics">Lyrikk</option>
        </select>
      </div>
      <FormField
        defaultValue={block?.position ?? defaultPosition}
        label="Posisjon"
        min={1}
        name="position"
        required
        type="number"
      />
      {type === 'heading' ? (
        <>
          <FormField
            defaultValue={text}
            label="Overskrift"
            maxLength={500}
            name="text"
            required
          />
          <FormField
            defaultValue={block ? blockLevelValue(block.payload) : 2}
            label="Nivå"
            max={6}
            min={1}
            name="level"
            required
            type="number"
          />
        </>
      ) : null}
      {type === 'text' ? (
        <div className="form-field content-block-form__wide">
          <label htmlFor={`${block?.id ?? 'new'}-body`}>Tekst</label>
          <textarea
            defaultValue={block?.type === 'text' ? text : ''}
            id={`${block?.id ?? 'new'}-body`}
            name="body"
            required
            rows={5}
          />
        </div>
      ) : null}
      {showsMediaFields ? (
        <>
          <div className="form-field content-block-form__wide">
            <label htmlFor={`${block?.id ?? 'new'}-media-file`}>
              Last opp media
            </label>
            <input
              accept={
                type === 'video'
                  ? 'video/mp4,video/webm,video/quicktime'
                  : 'image/jpeg,image/png,image/webp,image/avif'
              }
              disabled={disabled || mediaUpload.isPending}
              id={`${block?.id ?? 'new'}-media-file`}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) {
                  setUploadNotice(null)
                  mediaUpload.mutate(file)
                }
                event.currentTarget.value = ''
              }}
              type="file"
            />
          </div>
          {mediaUpload.isError ? (
            <FeedbackBanner title="Media kunne ikke lastes opp" tone="error">
              {formError(mediaUpload.error)}
            </FeedbackBanner>
          ) : null}
          {uploadNotice ? (
            <p className="image-field__notice" role="status">
              {uploadNotice}
            </p>
          ) : null}
          {mediaUrl ? (
            <div className="content-block-form__media-preview">
              {type === 'video' ? (
                <video controls src={mediaUrl} />
              ) : (
                <img alt="" src={mediaUrl} />
              )}
            </div>
          ) : null}
          <FormField
            error={fieldError(mediaUpload.error, 'media_id')}
            label="Media ID"
            name="media_id"
            onChange={(event) => setMediaId(event.currentTarget.value.trim())}
            required={type !== 'video'}
            value={mediaId}
          />
          {type === 'video' ? (
            <FormField
              defaultValue={blockVideoUrlValue(block)}
              label="Video-URL"
              name="url"
              placeholder="https://"
              type="url"
            />
          ) : (
            <FormField
              defaultValue={blockAltTextValue(block)}
              label="Alternativ tekst"
              maxLength={500}
              name="alt_text"
              required
            />
          )}
          <FormField
            defaultValue={blockCaptionValue(block)}
            label="Bildetekst"
            maxLength={2000}
            name="caption"
          />
        </>
      ) : null}
      {type === 'quote' ? (
        <>
          <div className="form-field content-block-form__wide">
            <label htmlFor={`${block?.id ?? 'new'}-quote`}>Sitat</label>
            <textarea
              defaultValue={block?.type === 'quote' ? text : ''}
              id={`${block?.id ?? 'new'}-quote`}
              name="text"
              required
              rows={4}
            />
          </div>
          <FormField
            defaultValue={
              block?.type === 'quote'
                ? blockSecondaryValue(block, 'attribution')
                : ''
            }
            label="Kilde"
            maxLength={500}
            name="attribution"
          />
        </>
      ) : null}
      {type === 'lyrics' ? (
        <>
          <div className="form-field content-block-form__wide">
            <label htmlFor={`${block?.id ?? 'new'}-lyrics`}>Lyrikk</label>
            <textarea
              defaultValue={block?.type === 'lyrics' ? text : ''}
              id={`${block?.id ?? 'new'}-lyrics`}
              name="text"
              required
              rows={6}
            />
          </div>
          <FormField
            defaultValue={
              block?.type === 'lyrics'
                ? blockSecondaryValue(block, 'language')
                : ''
            }
            label="Språk"
            name="language"
            pattern="[a-z]{2,3}(-[A-Z]{2})?"
            placeholder="no"
          />
        </>
      ) : null}
      <div className="content-block-form__actions">
        <SubmitButton
          disabled={disabled}
          pending={pending}
          pendingLabel="Lagrer …"
        >
          {block ? 'Lagre blokk' : 'Legg til blokk'}
        </SubmitButton>
        {block && onDelete ? (
          <button
            className="button button--secondary"
            disabled={disabled}
            onClick={onDelete}
            type="button"
          >
            Fjern blokk
          </button>
        ) : null}
      </div>
    </Form>
  )
}

export function ReleaseDetailPage() {
  const { releaseId = '' } = useParams()
  const { user, workspace } = useOutletContext<PortalOutletContext>()
  const queryClient = useQueryClient()
  const release = useQuery({
    queryKey: releaseKeys.detail(releaseId),
    queryFn: () => getRelease(releaseId),
    enabled: Boolean(releaseId),
    retry: false,
  })
  const metadata = useMutation({
    mutationFn: (input: ReleaseMetadataInput) =>
      updateRelease(releaseId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(releaseKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: releaseKeys.all })
    },
  })
  const artists = useQuery({
    queryKey: artistKeys.list(),
    queryFn: () => getArtists(),
    enabled: Boolean(release.data) && Boolean(workspace),
    retry: false,
  })
  const addArtist = useMutation({
    mutationFn: (input: ReleaseArtistInput) =>
      addReleaseArtist(releaseId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
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
        queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
      ])
    },
  })
  const createPage = useMutation({
    mutationFn: (input: ReleasePageInput) =>
      createReleasePage(releaseId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
      ])
    },
  })
  const updatePage = useMutation({
    mutationFn: ({
      pageId,
      input,
    }: {
      pageId: string
      input: Partial<ReleasePageInput>
    }) => updateReleasePage(pageId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
      ])
    },
  })
  const deletePage = useMutation({
    mutationFn: deleteReleasePage,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: releaseKeys.detail(releaseId),
        }),
        queryClient.invalidateQueries({ queryKey: releaseKeys.all }),
      ])
    },
  })
  const createBlock = useMutation({
    mutationFn: ({
      pageId,
      input,
    }: {
      pageId: string
      input: ReleaseContentBlockInput
    }) => createContentBlock(pageId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: releaseKeys.detail(releaseId),
      })
    },
  })
  const updateBlock = useMutation({
    mutationFn: ({
      pageId,
      blockId,
      input,
    }: {
      pageId: string
      blockId: string
      input: Partial<ReleaseContentBlockInput>
    }) => updateContentBlock(pageId, blockId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: releaseKeys.detail(releaseId),
      })
    },
  })
  const deleteBlock = useMutation({
    mutationFn: ({ pageId, blockId }: { pageId: string; blockId: string }) =>
      deleteContentBlock(pageId, blockId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: releaseKeys.detail(releaseId),
      })
    },
  })

  if (release.isPending) return <p aria-live="polite">Henter utgivelsen …</p>
  if (release.isError || !release.data || !workspace) {
    return (
      <FeedbackBanner title="Kunne ikke hente utgivelsen" tone="error">
        {formError(release.error)}
      </FeedbackBanner>
    )
  }

  const current = release.data
  const editableStatus = ['draft', 'unpublished'].includes(current.status)
  const manager = ['superadmin', 'label_admin', 'artist_admin'].includes(
    workspace.role,
  )
  const canManage =
    editableStatus && (manager || current.editor_user_ids.includes(user.id))

  async function attach(coverMediaId: string | null) {
    const updated = await updateReleaseCover(current.id, coverMediaId)
    queryClient.setQueryData(releaseKeys.detail(current.id), updated)
    await queryClient.invalidateQueries({ queryKey: releaseKeys.all })
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

  function handleReleasePageSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    createPage.mutate(pagePayload(data, sortedReleasePages.length + 1))
  }

  function handlePageUpdate(
    event: React.FormEvent<HTMLFormElement>,
    page: ReleaseContentPage,
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    updatePage.mutate({
      pageId: page.id,
      input: pagePayload(data, page.position),
    })
  }

  function handleBlockSubmit(
    event: React.FormEvent<HTMLFormElement>,
    page: ReleaseContentPage,
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const type = String(data.get('type') ?? 'text') as ReleaseContentBlockType
    createBlock.mutate({
      pageId: page.id,
      input: {
        position: Number(
          data.get('position') ?? (page.blocks ?? []).length + 1,
        ),
        type,
        payload: blockPayload(type, data),
      },
    })
  }

  function handleBlockUpdate(
    event: React.FormEvent<HTMLFormElement>,
    page: ReleaseContentPage,
    block: ReleaseContentBlock,
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const type = String(
      data.get('type') ?? block.type,
    ) as ReleaseContentBlockType
    updateBlock.mutate({
      pageId: page.id,
      blockId: block.id,
      input: {
        position: Number(data.get('position') ?? block.position),
        type,
        payload: blockPayload(type, data),
      },
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
            {current.status}
          </span>
        </div>
      </div>
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
                  {artist.is_primary ? 'Primærartist' : 'Medvirkende artist'} ·
                  Posisjon {artist.position}
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
                disabled={artists.isPending || availableArtists.length === 0}
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
                disabled={artists.isPending || availableArtists.length === 0}
                pending={addArtist.isPending}
                pendingLabel="Legger til …"
              >
                Legg til artist
              </SubmitButton>
            </div>
          </Form>
        ) : null}
      </section>
      <section
        className="settings-card"
        aria-labelledby="release-pages-heading"
      >
        <div className="settings-card__heading">
          <h2 id="release-pages-heading">Sider</h2>
          <p>
            {canManage
              ? 'Administrer sidene i det digitale platecoveret.'
              : 'Sider kan endres på redigerbare utgivelser du har tilgang til.'}
          </p>
        </div>
        {createPage.isError ? (
          <FeedbackBanner title="Kunne ikke opprette side" tone="error">
            {formError(createPage.error)}
          </FeedbackBanner>
        ) : null}
        {updatePage.isError ? (
          <FeedbackBanner title="Kunne ikke lagre side" tone="error">
            {formError(updatePage.error)}
          </FeedbackBanner>
        ) : null}
        {deletePage.isError ? (
          <FeedbackBanner title="Kunne ikke fjerne side" tone="error">
            {formError(deletePage.error)}
          </FeedbackBanner>
        ) : null}
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
        {sortedReleasePages.length === 0 ? (
          <div className="inline-empty">Ingen sider ennå.</div>
        ) : (
          <ul className="page-list">
            {sortedReleasePages.map((page) => (
              <li key={page.id}>
                {canManage ? (
                  <Form
                    className="page-row-form"
                    method="post"
                    onSubmit={(event) => handlePageUpdate(event, page)}
                  >
                    <FormField
                      defaultValue={page.title ?? ''}
                      label="Sidetittel"
                      maxLength={200}
                      name="title"
                    />
                    <FormField
                      defaultValue={page.position}
                      label="Posisjon"
                      min={1}
                      name="position"
                      required
                      type="number"
                    />
                    <div className="page-row-form__actions">
                      <SubmitButton
                        pending={updatePage.isPending}
                        pendingLabel="Lagrer …"
                      >
                        Lagre side
                      </SubmitButton>
                      <button
                        className="button button--secondary"
                        disabled={deletePage.isPending}
                        onClick={() => deletePage.mutate(page.id)}
                        type="button"
                      >
                        Fjern side
                      </button>
                    </div>
                  </Form>
                ) : (
                  <span>
                    {page.position}. {page.title ?? 'Uten tittel'}
                  </span>
                )}
                <div className="content-block-editor">
                  <h3>Blokker</h3>
                  {(page.blocks ?? []).length === 0 ? (
                    <div className="inline-empty">Ingen blokker ennå.</div>
                  ) : (
                    <ul className="content-block-list">
                      {[...(page.blocks ?? [])]
                        .sort(
                          (first, second) => first.position - second.position,
                        )
                        .map((block) => (
                          <li key={block.id}>
                            {canManage ? (
                              <ContentBlockForm
                                block={block}
                                disabled={
                                  updateBlock.isPending || deleteBlock.isPending
                                }
                                ownerId={current.owner.id}
                                ownerType={current.owner.type}
                                pending={updateBlock.isPending}
                                onDelete={() =>
                                  deleteBlock.mutate({
                                    pageId: page.id,
                                    blockId: block.id,
                                  })
                                }
                                onSubmit={(event) =>
                                  handleBlockUpdate(event, page, block)
                                }
                              />
                            ) : (
                              <div className="content-block-preview">
                                <strong>
                                  {block.position}. {block.type}
                                </strong>
                                <span>{blockTextValue(block)}</span>
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                  {canManage ? (
                    <ContentBlockForm
                      defaultPosition={(page.blocks ?? []).length + 1}
                      disabled={createBlock.isPending}
                      ownerId={current.owner.id}
                      ownerType={current.owner.type}
                      pending={createBlock.isPending}
                      onSubmit={(event) => handleBlockSubmit(event, page)}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <Form
            className="page-create-form"
            method="post"
            onSubmit={handleReleasePageSubmit}
          >
            <FormField
              error={fieldError(createPage.error, 'title')}
              label="Ny side"
              maxLength={200}
              name="title"
            />
            <FormField
              defaultValue={sortedReleasePages.length + 1}
              error={fieldError(createPage.error, 'position')}
              label="Posisjon"
              min={1}
              name="position"
              required
              type="number"
            />
            <SubmitButton
              pending={createPage.isPending}
              pendingLabel="Oppretter …"
            >
              Opprett side
            </SubmitButton>
          </Form>
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
              <select defaultValue={current.type} id="release-type" name="type">
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
                  fieldError(metadata.error, 'description') ? true : undefined
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
      <Link className="resource-back-link" to="/releases">
        Tilbake til alle utgivelser
      </Link>
    </div>
  )
}
