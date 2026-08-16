import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Form } from 'react-router'
import { fieldError, formError } from '../features/auth/validation.ts'
import { useDebouncedValue } from '../features/media/useDebouncedValue.ts'
import { useMediaUrl } from '../features/media/useMediaUrl.ts'
import { uploadMedia, type MediaOwnerType } from '../lib/media.ts'
import type {
  ReleaseContentBlock,
  ReleaseContentBlockInput,
  ReleaseContentBlockType,
} from '../lib/releases.ts'
import {
  blockAltTextValue,
  blockCaptionValue,
  blockLevelValue,
  blockMediaId,
  blockPayload,
  blockSecondaryValue,
  blockTextValue,
  blockTypeLabels,
  blockVideoUrlValue,
  mediaKindForBlock,
} from '../lib/contentBlocks.ts'
import { FeedbackBanner } from './FeedbackBanner.tsx'
import { FormField } from './FormField.tsx'
import { SubmitButton } from './SubmitButton.tsx'

/**
 * Skjemaet eier sin egen nyttelast: blokktypen bestemmer hvilke felt som vises,
 * og dermed hvilken form `payload` har. Kalleren får type og payload, og legger
 * selv på posisjonen når en ny blokk opprettes.
 *
 * Posisjonen er bevisst ikke et felt her. Rekkefølgen endres med egne knapper
 * mot rekkefølge-endepunktet, som verken bumper `version` eller kan kollidere
 * med en opptatt posisjon.
 */
export function ContentBlockForm({
  block,
  disabled,
  ownerId,
  ownerType,
  onDelete,
  onSubmit,
  pending,
}: {
  block?: ReleaseContentBlock
  disabled?: boolean
  ownerId: string
  ownerType: MediaOwnerType
  onDelete?: () => void
  onSubmit: (input: Pick<ReleaseContentBlockInput, 'type' | 'payload'>) => void
  pending: boolean
}) {
  const [type, setType] = useState<ReleaseContentBlockType>(
    block?.type ?? 'text',
  )
  const [mediaId, setMediaId] = useState(blockMediaId(block))
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)
  const text = block ? blockTextValue(block) : ''
  const showsMediaFields = ['image', 'gallery', 'video'].includes(type)
  // Feltet mater query-nøkkelen direkte, så uten debounce blir hvert
  // tastetrykk et kall. Lagrede blokker treffer initialverdien og vises straks.
  const settledMediaId = useDebouncedValue(mediaId.trim(), 400)
  const mediaPreview = useMediaUrl(settledMediaId || null)
  const mediaUpload = useMutation({
    mutationFn: (file: File) =>
      uploadMedia(ownerType, ownerId, mediaKindForBlock(type), file),
    onSuccess: (media) => {
      setMediaId(media.id)
      setUploadNotice('Media er lastet opp. Lagre blokken for å bruke den.')
    },
  })
  const mediaUrl = mediaPreview.url

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({ type, payload: blockPayload(type, data) })
  }

  return (
    <Form className="content-block-form" method="post" onSubmit={handleSubmit}>
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
          {Object.entries(blockTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
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
            onChange={(event) => setMediaId(event.currentTarget.value)}
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
