import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Form, useOutletContext } from 'react-router'
import { FeedbackBanner } from '../components/FeedbackBanner.tsx'
import { fieldError, formError } from '../features/auth/validation.ts'
import {
  artistTeamKeys,
  inviteArtistMember,
  removeArtistMember,
  updateArtistMember,
  type ArtistMember,
} from '../lib/artistTeam.ts'
import {
  inviteOrganizationMember,
  organizationTeamKeys,
  removeOrganizationMember,
  updateOrganizationMember,
  type OrganizationMember,
} from '../lib/organizationTeam.ts'
import type { PortalOutletContext } from '../lib/portal.ts'
import { WorkspaceSectionPage } from './WorkspaceSectionPage.tsx'
import { ForbiddenPage } from './states/ForbiddenPage.tsx'
import {
  artistMembersQueryOptions,
  organizationMembersQueryOptions,
} from '../lib/queryOptions.ts'

function LabelTeamManager({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string
  workspaceName: string
}) {
  const queryClient = useQueryClient()
  const [removing, setRemoving] = useState<OrganizationMember | null>(null)
  const [savedInvitation, setSavedInvitation] = useState<string | null>(null)
  const teamKey = organizationTeamKeys.all(workspaceId)
  const members = useQuery(organizationMembersQueryOptions(workspaceId))
  const refresh = () => queryClient.invalidateQueries({ queryKey: teamKey })
  const invitation = useMutation({
    mutationFn: (input: { email: string; role: OrganizationMember['role'] }) =>
      inviteOrganizationMember(workspaceId, input),
    onSuccess: (result) => setSavedInvitation(result.email),
  })
  const update = useMutation({
    mutationFn: ({
      membershipId,
      input,
    }: {
      membershipId: string
      input: Partial<Pick<OrganizationMember, 'role' | 'status'>>
    }) => updateOrganizationMember(workspaceId, membershipId, input),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (membershipId: string) =>
      removeOrganizationMember(workspaceId, membershipId),
    onSuccess: async () => {
      setRemoving(null)
      await refresh()
    },
  })

  function handleInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavedInvitation(null)
    const data = new FormData(event.currentTarget)
    invitation.mutate({
      email: String(data.get('email') ?? '').trim(),
      role: String(data.get('role')) as OrganizationMember['role'],
    })
  }

  return (
    <div className="team-page">
      <div>
        <p className="eyebrow">{workspaceName}</p>
        <h1 className="page-title">Labelteam</h1>
        <p className="page-intro">
          Inviter medlemmer, korriger roller og stopp tilganger. Laravel
          håndhever at labelen alltid beholder en aktiv administrator.
        </p>
      </div>

      <section
        className="settings-card"
        aria-labelledby="invite-member-heading"
      >
        <div className="settings-card__heading">
          <h2 id="invite-member-heading">Inviter medlem</h2>
          <p>Invitasjonen sendes på e-post og er tidsbegrenset.</p>
        </div>
        {savedInvitation ? (
          <FeedbackBanner title="Invitasjonen er sendt" tone="success">
            {savedInvitation} kan nå godta invitasjonen.
          </FeedbackBanner>
        ) : null}
        {invitation.isError ? (
          <FeedbackBanner title="Kunne ikke sende invitasjonen" tone="error">
            {formError(invitation.error)}
          </FeedbackBanner>
        ) : null}
        <Form
          className="team-invite-form"
          method="post"
          onSubmit={handleInvitation}
        >
          <div className="form-field">
            <label htmlFor="team-email">E-post</label>
            <input
              aria-invalid={
                fieldError(invitation.error, 'email') ? true : undefined
              }
              id="team-email"
              name="email"
              required
              type="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="team-role">Rolle</label>
            <select id="team-role" name="role">
              <option value="label_user">Label User</option>
              <option value="label_admin">Label Admin</option>
            </select>
          </div>
          <button
            className="button button--primary"
            disabled={invitation.isPending}
            type="submit"
          >
            {invitation.isPending ? 'Sender …' : 'Send invitasjon'}
          </button>
        </Form>
      </section>

      <section className="settings-card" aria-labelledby="team-members-heading">
        <div className="settings-card__heading">
          <h2 id="team-members-heading">Medlemmer</h2>
          <p>Aktive og suspenderte medlemskap i labelen.</p>
        </div>
        {members.isPending ? <p aria-live="polite">Henter team …</p> : null}
        {members.isError ? (
          <FeedbackBanner title="Kunne ikke hente teamet" tone="error">
            {formError(members.error)}
          </FeedbackBanner>
        ) : null}
        {update.isError || remove.isError ? (
          <FeedbackBanner title="Kunne ikke oppdatere medlemmet" tone="error">
            {formError(update.error ?? remove.error)}
          </FeedbackBanner>
        ) : null}
        {members.data?.length === 0 ? (
          <div className="inline-empty">Ingen medlemmer ble funnet.</div>
        ) : null}
        {members.data ? (
          <ul className="team-list">
            {members.data.map((member) => (
              <li key={member.id}>
                <div className="team-member-identity">
                  <strong>
                    {member.user.display_name ?? member.user.email}
                  </strong>
                  <span>{member.user.email}</span>
                </div>
                <select
                  aria-label={`Rolle for ${member.user.email}`}
                  defaultValue={member.role}
                  onChange={(event) =>
                    update.mutate({
                      membershipId: member.id,
                      input: {
                        role: event.target.value as OrganizationMember['role'],
                      },
                    })
                  }
                >
                  <option value="label_user">Label User</option>
                  <option value="label_admin">Label Admin</option>
                </select>
                <span className={`status-pill status-pill--${member.status}`}>
                  {member.status === 'active' ? 'Aktiv' : 'Suspendert'}
                </span>
                <div className="team-member-actions">
                  <button
                    className="button button--secondary button--small"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        membershipId: member.id,
                        input: {
                          status:
                            member.status === 'active' ? 'suspended' : 'active',
                        },
                      })
                    }
                    type="button"
                  >
                    {member.status === 'active' ? 'Suspender' : 'Aktiver'}
                  </button>
                  <button
                    className="button button--danger-quiet button--small"
                    onClick={() => setRemoving(member)}
                    type="button"
                  >
                    Fjern
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {removing ? (
        <section className="confirmation-panel confirmation-panel--danger">
          <div>
            <h2>Fjern {removing.user.display_name ?? removing.user.email}?</h2>
            <p>Medlemmet mister labeltilgangen umiddelbart.</p>
          </div>
          <div className="confirmation-panel__actions">
            <button
              className="button button--secondary"
              onClick={() => setRemoving(null)}
              type="button"
            >
              Avbryt
            </button>
            <button
              className="button button--danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate(removing.id)}
              type="button"
            >
              {remove.isPending ? 'Fjerner …' : 'Bekreft fjerning'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ArtistTeamManager({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string
  workspaceName: string
}) {
  const queryClient = useQueryClient()
  const [removing, setRemoving] = useState<ArtistMember | null>(null)
  const [savedInvitation, setSavedInvitation] = useState<string | null>(null)
  const teamKey = artistTeamKeys.all(workspaceId)
  const members = useQuery(artistMembersQueryOptions(workspaceId))
  const refresh = () => queryClient.invalidateQueries({ queryKey: teamKey })
  const invitation = useMutation({
    mutationFn: (input: { email: string; role: ArtistMember['role'] }) =>
      inviteArtistMember(workspaceId, input),
    onSuccess: (result) => setSavedInvitation(result.email),
  })
  const update = useMutation({
    mutationFn: ({
      membershipId,
      input,
    }: {
      membershipId: string
      input: Partial<Pick<ArtistMember, 'role' | 'status'>>
    }) => updateArtistMember(workspaceId, membershipId, input),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (membershipId: string) =>
      removeArtistMember(workspaceId, membershipId),
    onSuccess: async () => {
      setRemoving(null)
      await refresh()
    },
  })

  function handleInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavedInvitation(null)
    const data = new FormData(event.currentTarget)
    invitation.mutate({
      email: String(data.get('email') ?? '').trim(),
      role: String(data.get('role')) as ArtistMember['role'],
    })
  }

  return (
    <div className="team-page">
      <div>
        <p className="eyebrow">{workspaceName}</p>
        <h1 className="page-title">Artistteam</h1>
        <p className="page-intro">
          Inviter medlemmer, korriger roller og stopp tilganger. Laravel
          håndhever at artisten alltid beholder en aktiv administrator.
        </p>
      </div>

      <section
        className="settings-card"
        aria-labelledby="invite-artist-member-heading"
      >
        <div className="settings-card__heading">
          <h2 id="invite-artist-member-heading">Inviter medlem</h2>
          <p>Invitasjonen sendes på e-post og er tidsbegrenset.</p>
        </div>
        {savedInvitation ? (
          <FeedbackBanner title="Invitasjonen er sendt" tone="success">
            {savedInvitation} kan nå godta invitasjonen.
          </FeedbackBanner>
        ) : null}
        {invitation.isError ? (
          <FeedbackBanner title="Kunne ikke sende invitasjonen" tone="error">
            {formError(invitation.error)}
          </FeedbackBanner>
        ) : null}
        <Form
          className="team-invite-form"
          method="post"
          onSubmit={handleInvitation}
        >
          <div className="form-field">
            <label htmlFor="artist-team-email">E-post</label>
            <input
              aria-invalid={
                fieldError(invitation.error, 'email') ? true : undefined
              }
              id="artist-team-email"
              name="email"
              required
              type="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="artist-team-role">Rolle</label>
            <select id="artist-team-role" name="role">
              <option value="artist_user">Artist User</option>
              <option value="artist_admin">Artist Admin</option>
            </select>
          </div>
          <button
            className="button button--primary"
            disabled={invitation.isPending}
            type="submit"
          >
            {invitation.isPending ? 'Sender …' : 'Send invitasjon'}
          </button>
        </Form>
      </section>

      <section
        className="settings-card"
        aria-labelledby="artist-members-heading"
      >
        <div className="settings-card__heading">
          <h2 id="artist-members-heading">Medlemmer</h2>
          <p>Aktive og suspenderte medlemskap i artisten.</p>
        </div>
        {members.isPending ? <p aria-live="polite">Henter team …</p> : null}
        {members.isError ? (
          <FeedbackBanner title="Kunne ikke hente teamet" tone="error">
            {formError(members.error)}
          </FeedbackBanner>
        ) : null}
        {update.isError || remove.isError ? (
          <FeedbackBanner title="Kunne ikke oppdatere medlemmet" tone="error">
            {formError(update.error ?? remove.error)}
          </FeedbackBanner>
        ) : null}
        {members.data?.length === 0 ? (
          <div className="inline-empty">Ingen medlemmer ble funnet.</div>
        ) : null}
        {members.data ? (
          <ul className="team-list">
            {members.data.map((member) => (
              <li key={member.id}>
                <div className="team-member-identity">
                  <strong>
                    {member.user.display_name ?? member.user.email}
                  </strong>
                  <span>{member.user.email}</span>
                </div>
                <select
                  aria-label={`Rolle for ${member.user.email}`}
                  defaultValue={member.role}
                  onChange={(event) =>
                    update.mutate({
                      membershipId: member.id,
                      input: {
                        role: event.target.value as ArtistMember['role'],
                      },
                    })
                  }
                >
                  <option value="artist_user">Artist User</option>
                  <option value="artist_admin">Artist Admin</option>
                </select>
                <span className={`status-pill status-pill--${member.status}`}>
                  {member.status === 'active' ? 'Aktiv' : 'Suspendert'}
                </span>
                <div className="team-member-actions">
                  <button
                    className="button button--secondary button--small"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        membershipId: member.id,
                        input: {
                          status:
                            member.status === 'active' ? 'suspended' : 'active',
                        },
                      })
                    }
                    type="button"
                  >
                    {member.status === 'active' ? 'Suspender' : 'Aktiver'}
                  </button>
                  <button
                    className="button button--danger-quiet button--small"
                    onClick={() => setRemoving(member)}
                    type="button"
                  >
                    Fjern
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {removing ? (
        <section className="confirmation-panel confirmation-panel--danger">
          <div>
            <h2>Fjern {removing.user.display_name ?? removing.user.email}?</h2>
            <p>Medlemmet mister artisttilgangen umiddelbart.</p>
          </div>
          <div className="confirmation-panel__actions">
            <button
              className="button button--secondary"
              onClick={() => setRemoving(null)}
              type="button"
            >
              Avbryt
            </button>
            <button
              className="button button--danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate(removing.id)}
              type="button"
            >
              {remove.isPending ? 'Fjerner …' : 'Bekreft fjerning'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export function LabelTeamPage() {
  const { workspace } = useOutletContext<PortalOutletContext>()

  if (!workspace) {
    return <WorkspaceSectionPage />
  }

  if (workspace.type === 'organization') {
    if (workspace.role !== 'label_admin') {
      return <ForbiddenPage />
    }

    return (
      <LabelTeamManager
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
    )
  }

  if (workspace.type === 'artist') {
    if (workspace.role !== 'artist_admin') {
      return <ForbiddenPage />
    }

    return (
      <ArtistTeamManager
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
    )
  }

  return <WorkspaceSectionPage />
}
