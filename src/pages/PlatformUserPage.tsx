import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import {
  AccountStatusPanel,
  RoleCorrectionPanel,
  type CorrectionTarget,
} from '../components/UserAdministrationPanels.tsx'
import { formError } from '../features/auth/validation.ts'
import {
  correctMembershipRole,
  platformUserKeys,
  updatePlatformUserStatus,
  type ArtistMembership,
  type HierarchyRelease,
  type HierarchyScope,
  type OrganizationMembership,
} from '../lib/platformUsers.ts'
import { roleLabel, type PortalOutletContext } from '../lib/portal.ts'
import { platformUserDetailQueryOptions } from '../lib/queryOptions.ts'

function ResourceStatus({ status }: { status: string }) {
  return (
    <span
      className={`status-pill status-pill--${status === 'active' ? 'active' : 'suspended'}`}
    >
      {status === 'active' ? 'Aktiv' : 'Suspendert'}
    </span>
  )
}

function ReleaseList({ releases }: { releases: HierarchyRelease[] }) {
  if (releases.length === 0) {
    return <p className="hierarchy-empty">Ingen utgivelser.</p>
  }

  return (
    <ul className="hierarchy-release-list">
      {releases.map((release) => (
        <li key={release.id}>
          <div>
            <strong>{release.title}</strong>
            <span>
              {release.type}
              {release.release_date ? ` · ${release.release_date}` : ''}
            </span>
          </div>
          <span>{release.status}</span>
        </li>
      ))}
    </ul>
  )
}

function RelatedScopes({
  label,
  scopes,
}: {
  label: string
  scopes: HierarchyScope[]
}) {
  return (
    <div className="hierarchy-related">
      <h4>{label}</h4>
      {scopes.length === 0 ? (
        <p className="hierarchy-empty">Ingen aktive relasjoner.</p>
      ) : (
        <ul>
          {scopes.map((scope) => (
            <li key={scope.relationship_id}>
              <strong>{scope.name}</strong>
              <span>{scope.relationship_type.replaceAll('_', ' ')}</span>
              <ResourceStatus status={scope.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OrganizationMembershipCard({
  membership,
  onCorrect,
}: {
  membership: OrganizationMembership
  onCorrect: (target: CorrectionTarget) => void
}) {
  return (
    <article className="hierarchy-card">
      <header>
        <div>
          <span className="status-kicker">Labelmedlemskap</span>
          <h3>
            <Link to={`/labels/${membership.organization.id}`}>
              {membership.organization.name}
            </Link>
          </h3>
          <p>{roleLabel(membership.role)}</p>
          <button
            className="text-button"
            onClick={() =>
              onCorrect({
                type: 'organization',
                membershipId: membership.id,
                scopeName: membership.organization.name,
                role: membership.role,
              })
            }
            type="button"
          >
            Korriger rolle
          </button>
        </div>
        <div className="hierarchy-card__statuses">
          <ResourceStatus status={membership.status} />
          {membership.organization.status !== membership.status ? (
            <span>Label: {membership.organization.status}</span>
          ) : null}
        </div>
      </header>
      <RelatedScopes
        label="Tilknyttede artister"
        scopes={membership.organization.artists}
      />
      <div className="hierarchy-related">
        <h4>Labelens utgivelser</h4>
        <ReleaseList releases={membership.organization.releases} />
      </div>
    </article>
  )
}

function ArtistMembershipCard({
  membership,
  onCorrect,
}: {
  membership: ArtistMembership
  onCorrect: (target: CorrectionTarget) => void
}) {
  return (
    <article className="hierarchy-card">
      <header>
        <div>
          <span className="status-kicker">Artistmedlemskap</span>
          <h3>{membership.artist.name}</h3>
          <p>{roleLabel(membership.role)}</p>
          <button
            className="text-button"
            onClick={() =>
              onCorrect({
                type: 'artist',
                membershipId: membership.id,
                scopeName: membership.artist.name,
                role: membership.role,
              })
            }
            type="button"
          >
            Korriger rolle
          </button>
        </div>
        <div className="hierarchy-card__statuses">
          <ResourceStatus status={membership.status} />
          {membership.artist.status !== membership.status ? (
            <span>Artist: {membership.artist.status}</span>
          ) : null}
        </div>
      </header>
      <RelatedScopes
        label="Tilknyttede labels"
        scopes={membership.artist.organizations}
      />
      <div className="hierarchy-related">
        <h4>Artistens utgivelser</h4>
        <ReleaseList releases={membership.artist.releases} />
      </div>
    </article>
  )
}

export function PlatformUserPage() {
  const { userId = '' } = useParams()
  const context = useOutletContext<PortalOutletContext | undefined>()
  const queryClient = useQueryClient()
  const [correctionTarget, setCorrectionTarget] =
    useState<CorrectionTarget | null>(null)
  const [changingAccountStatus, setChangingAccountStatus] = useState(false)
  const user = useQuery({
    ...platformUserDetailQueryOptions(userId),
    enabled: Boolean(userId),
  })
  const roleCorrection = useMutation({
    mutationFn: (input: {
      role: OrganizationMembership['role'] | ArtistMembership['role']
      reason: string
      confirmation: string
    }) =>
      correctMembershipRole(
        userId,
        correctionTarget!.membershipId,
        correctionTarget!.type,
        {
          value: input.role,
          reason: input.reason,
          confirmation: input.confirmation,
        },
      ),
    onSuccess: async () => {
      setCorrectionTarget(null)
      await queryClient.invalidateQueries({
        queryKey: platformUserKeys.detail(userId),
      })
    },
  })
  const accountStatus = useMutation({
    mutationFn: (input: { reason: string; confirmation: string }) =>
      updatePlatformUserStatus(userId, {
        value: user.data?.status === 'active' ? 'suspended' : 'active',
        reason: input.reason,
        confirmation: input.confirmation,
      }),
    onSuccess: async () => {
      setChangingAccountStatus(false)
      await queryClient.invalidateQueries({
        queryKey: platformUserKeys.detail(userId),
      })
    },
  })

  if (user.isPending) return <p aria-live="polite">Henter bruker …</p>

  if (user.isError || !user.data) {
    return (
      <FeedbackBanner title="Kunne ikke hente brukeren" tone="error">
        <p>{formError(user.error)}</p>
        <Link to="/search">Tilbake til søk</Link>
      </FeedbackBanner>
    )
  }

  const current = user.data
  const membershipCount =
    current.memberships.organizations.length +
    current.memberships.artists.length
  const isCurrentUser = context?.user.id === current.id

  return (
    <div className="user-hierarchy-page">
      <div>
        <p className="eyebrow">Superadmin · Brukere</p>
        <div className="resource-title-row">
          <div>
            <h1 className="page-title">
              {current.display_name ?? current.email}
            </h1>
            <p className="page-intro">{current.email}</p>
          </div>
          <ResourceStatus status={current.status} />
        </div>
      </div>

      <section className="user-fact-grid" aria-label="Brukerstatus">
        <article>
          <span className="status-kicker">Medlemskap</span>
          <strong>{membershipCount}</strong>
          <p>Aktive og suspenderte roller.</p>
        </article>
        <article>
          <span className="status-kicker">E-post</span>
          <strong>
            {current.email_verified_at ? 'Verifisert' : 'Ikke verifisert'}
          </strong>
          <p>{current.email_verified_at ?? 'Ingen verifisering registrert.'}</p>
        </article>
        <article>
          <span className="status-kicker">Plattformrolle</span>
          <strong>{current.is_superadmin ? 'Superadmin' : 'Bruker'}</strong>
          <p>Opprettet {formatDate(current.created_at)}</p>
        </article>
      </section>

      <section
        className="user-hierarchy-section"
        aria-labelledby="memberships-heading"
      >
        <div className="section-heading">
          <p className="eyebrow">Ressurshierarki</p>
          <h2 id="memberships-heading">Medlemskap og tilknytninger</h2>
          <p>
            Oversikten viser roller, relaterte ressurser og utgivelser Laravel
            har returnert for brukeren.
          </p>
        </div>

        {membershipCount === 0 ? (
          <div className="inline-empty">Brukeren har ingen medlemskap.</div>
        ) : (
          <div className="hierarchy-grid">
            {current.memberships.organizations.map((membership) => (
              <OrganizationMembershipCard
                key={membership.id}
                membership={membership}
                onCorrect={(target) => {
                  roleCorrection.reset()
                  setCorrectionTarget(target)
                }}
              />
            ))}
            {current.memberships.artists.map((membership) => (
              <ArtistMembershipCard
                key={membership.id}
                membership={membership}
                onCorrect={(target) => {
                  roleCorrection.reset()
                  setCorrectionTarget(target)
                }}
              />
            ))}
          </div>
        )}
      </section>

      {correctionTarget ? (
        <RoleCorrectionPanel
          error={roleCorrection.error}
          pending={roleCorrection.isPending}
          target={correctionTarget}
          userId={current.id}
          onCancel={() => setCorrectionTarget(null)}
          onSubmit={(input) => roleCorrection.mutate(input)}
        />
      ) : null}

      <section className="settings-card" aria-labelledby="assignments-heading">
        <div className="settings-card__heading">
          <h2 id="assignments-heading">Redaktøroppdrag</h2>
          <p>Utgivelser brukeren er eksplisitt tildelt.</p>
        </div>
        <ReleaseList releases={current.release_editor_assignments} />
      </section>

      <section
        className={`settings-card${current.status === 'active' ? ' settings-card--danger' : ''}`}
        aria-labelledby="account-administration-heading"
      >
        <div className="settings-card__heading settings-card__heading--row">
          <div>
            <h2 id="account-administration-heading">Kontoadministrasjon</h2>
            <p>
              {isCurrentUser
                ? 'Du kan ikke suspendere din egen superadmin-konto.'
                : current.status === 'active'
                  ? 'Suspensjon tilbakekaller alle økter og blokkerer ny innlogging.'
                  : `Suspendert${current.suspended_at ? ` ${formatDate(current.suspended_at)}` : ''}. Gjenåpning gjenoppretter ikke gamle økter.`}
            </p>
          </div>
          {!changingAccountStatus ? (
            <button
              className={
                current.status === 'active'
                  ? 'button button--danger-quiet'
                  : 'button button--primary'
              }
              disabled={isCurrentUser && current.status === 'active'}
              onClick={() => {
                accountStatus.reset()
                setChangingAccountStatus(true)
              }}
              type="button"
            >
              {current.status === 'active'
                ? 'Suspender konto'
                : 'Gjenåpne konto'}
            </button>
          ) : null}
        </div>
        {changingAccountStatus ? (
          <AccountStatusPanel
            error={accountStatus.error}
            pending={accountStatus.isPending}
            status={current.status}
            userId={current.id}
            onCancel={() => setChangingAccountStatus(false)}
            onSubmit={(input) => accountStatus.mutate(input)}
          />
        ) : null}
      </section>

      <Link className="resource-back-link" to="/search">
        Tilbake til søk
      </Link>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' }).format(
    new Date(value),
  )
}
