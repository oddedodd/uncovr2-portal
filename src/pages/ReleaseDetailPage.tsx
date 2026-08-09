import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useOutletContext, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { ImageUploadField } from '../components/ImageUploadField.tsx'
import { formError } from '../features/auth/validation.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { getRelease, releaseKeys, updateReleaseCover } from '../lib/releases.ts'

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
        aria-labelledby="release-details-heading"
      >
        <div className="settings-card__heading">
          <h2 id="release-details-heading">Utgivelsesinformasjon</h2>
        </div>
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
      </section>
      <Link className="resource-back-link" to="/releases">
        Tilbake til alle utgivelser
      </Link>
    </div>
  )
}
