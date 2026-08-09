import { useMutation, useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { formError } from '../features/auth/validation.ts'
import { ApiError } from '../lib/api.ts'
import {
  deleteMedia,
  getMediaDownloadUrls,
  mediaKeys,
  uploadImage,
  type MediaOwnerType,
  type MediaReference,
} from '../lib/media.ts'
import { FeedbackBanner } from './FeedbackBanner.tsx'

const imageTypes = 'image/jpeg,image/png,image/webp,image/avif'

export function ImageUploadField({
  ownerType,
  ownerId,
  label,
  description,
  media,
  canManage,
  variant = 'logo',
  onAttach,
  onUpload,
}: {
  ownerType: MediaOwnerType
  ownerId: string
  label: string
  description: string
  media: MediaReference | null
  canManage: boolean
  variant?: 'logo' | 'photo' | 'cover'
  onAttach: (mediaId: string | null) => Promise<void>
  onUpload?: (file: File) => Promise<void>
}) {
  const inputId = useId()
  const [notice, setNotice] = useState<string | null>(null)
  const download = useQuery({
    queryKey: mediaKeys.downloads(media ? [media.id] : []),
    queryFn: () => getMediaDownloadUrls(media ? [media.id] : []),
    enabled: Boolean(media?.id),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (onUpload) {
        await onUpload(file)
        return
      }

      const uploaded = await uploadImage(ownerType, ownerId, file)
      try {
        await onAttach(uploaded.id)
      } catch (error) {
        await deleteMedia(uploaded.id).catch(() => undefined)
        throw error
      }
      if (media?.id && media.id !== uploaded.id) {
        await deleteMedia(media.id).catch(() => undefined)
      }
    },
    onSuccess: () => setNotice('Bildet er lagret.'),
  })
  const remove = useMutation({
    mutationFn: async () => {
      if (!media) return
      await onAttach(null)
      await deleteMedia(media.id).catch(() => undefined)
    },
    onSuccess: () => setNotice('Bildet er fjernet.'),
  })
  const imageUrl = media ? download.data?.get(media.id) : undefined
  const busy = mutation.isPending || remove.isPending

  return (
    <div className="image-field">
      <div className={`image-field__preview image-field__preview--${variant}`}>
        {imageUrl ? (
          <img alt={`${label} – nåværende bilde`} src={imageUrl} />
        ) : (
          <span>{download.isPending ? 'Henter …' : 'Ingen bilde'}</span>
        )}
      </div>
      <div className="image-field__content">
        <div>
          <h3>{label}</h3>
          <p>{description}</p>
          {media?.width && media.height ? (
            <small>
              {media.width} × {media.height} piksler
            </small>
          ) : null}
        </div>
        {download.isError ? (
          <FeedbackBanner
            title="Forhåndsvisningen kunne ikke hentes"
            tone="error"
          >
            {formError(download.error)}
          </FeedbackBanner>
        ) : null}
        {mutation.isError || remove.isError ? (
          <FeedbackBanner title="Bildet kunne ikke lagres" tone="error">
            {imageUploadError(mutation.error ?? remove.error)}
          </FeedbackBanner>
        ) : null}
        {notice ? (
          <p className="image-field__notice" role="status">
            {notice}
          </p>
        ) : null}
        {canManage ? (
          <div className="image-field__actions">
            <label
              className="button button--secondary button--small"
              htmlFor={inputId}
            >
              {busy ? 'Arbeider …' : media ? 'Bytt bilde' : 'Last opp bilde'}
            </label>
            <input
              accept={imageTypes}
              disabled={busy}
              id={inputId}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) {
                  setNotice(null)
                  mutation.mutate(file)
                }
                event.currentTarget.value = ''
              }}
              type="file"
            />
            {media ? (
              <button
                className="button button--danger-quiet button--small"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Vil du fjerne ${label.toLowerCase()}?`)) {
                    setNotice(null)
                    remove.mutate()
                  }
                }}
                type="button"
              >
                Fjern bilde
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function imageUploadError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Du har ikke tilgang til å endre bildet.'
    if (error.status === 413) return 'Bildet er for stort.'
    if (error.status === 422) {
      const details = error.details as { image?: string | string[] } | undefined
      const imageError = details?.image
      if (Array.isArray(imageError)) return imageError.join(' ')
      if (imageError) return imageError
    }
  }

  return formError(error)
}
