import { createBrowserRouter } from 'react-router'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { PortalLayout } from '../components/PortalLayout.tsx'
import { RequireAuth } from '../components/RequireAuth.tsx'
import { RequireSuperadmin } from '../components/RequireSuperadmin.tsx'

import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { LoginPage } from '../pages/auth/LoginPage.tsx'
import { ForbiddenPage } from '../pages/states/ForbiddenPage.tsx'
import { RouteErrorPage } from '../pages/states/RouteErrorPage.tsx'
import { queryClient } from './queryClient.ts'
import {
  artistDetailQueryOptions,
  artistListQueryOptions,
  currentUserQueryOptions,
  organizationDetailQueryOptions,
  organizationListQueryOptions,
  platformUserDetailQueryOptions,
  releaseDetailQueryOptions,
  sessionsQueryOptions,
  workspacesQueryOptions,
} from '../lib/queryOptions.ts'

/**
 * Loaderne under starter hentingen ved navigering, før komponentene monterer.
 * Det er poenget: `RequireAuth` viser en lasteskjerm i stedet for `<Outlet/>`
 * mens `/me` er underveis, så en query som først startes i sidekomponenten kan
 * ikke begynne før innloggingssjekken er ferdig. Med loaderne går de i
 * parallell i stedet for etter hverandre.
 *
 * De må derfor være synkrone. `prefetchQuery` returnerer et løfte vi bevisst
 * ikke venter på — feil havner i cachen og håndteres av `useQuery` i
 * komponenten, akkurat som før.
 */

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/register',
        lazy: async () => ({
          Component: (await import('../pages/auth/RegisterPage.tsx'))
            .RegisterPage,
        }),
      },
      {
        path: '/verify-email',
        lazy: async () => ({
          Component: (await import('../pages/auth/VerifyEmailPage.tsx'))
            .VerifyEmailPage,
        }),
      },
      {
        path: '/forgot-password',
        lazy: async () => ({
          Component: (await import('../pages/auth/ForgotPasswordPage.tsx'))
            .ForgotPasswordPage,
        }),
      },
      {
        path: '/reset-password',
        lazy: async () => ({
          Component: (await import('../pages/auth/ResetPasswordPage.tsx'))
            .ResetPasswordPage,
        }),
      },
      {
        path: '/session-expired',
        lazy: async () => ({
          Component: (await import('../pages/auth/SessionExpiredPage.tsx'))
            .SessionExpiredPage,
        }),
      },
      {
        path: '/invitations/accept',
        lazy: async () => {
          const [
            { InvitationEntryPage },
            { AcceptOrganizationInvitationPage },
          ] = await Promise.all([
            import('../pages/InvitationEntryPage.tsx'),
            import('../pages/AcceptOrganizationInvitationPage.tsx'),
          ])

          return {
            Component: () => (
              <InvitationEntryPage kind="label">
                <AcceptOrganizationInvitationPage />
              </InvitationEntryPage>
            ),
          }
        },
      },
      {
        path: '/artist-invitations/accept',
        lazy: async () => {
          const [{ InvitationEntryPage }, { AcceptArtistInvitationPage }] =
            await Promise.all([
              import('../pages/InvitationEntryPage.tsx'),
              import('../pages/AcceptArtistInvitationPage.tsx'),
            ])

          return {
            Component: () => (
              <InvitationEntryPage kind="artist">
                <AcceptArtistInvitationPage />
              </InvitationEntryPage>
            ),
          }
        },
      },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    loader: () => {
      void queryClient.prefetchQuery(currentUserQueryOptions)
      void queryClient.prefetchQuery(workspacesQueryOptions)
      return null
    },
    children: [
      {
        path: '/',
        element: <PortalLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('../pages/DashboardPage.tsx'))
                .DashboardPage,
            }),
          },
          {
            // Søket avhenger av et debouncet tekstfelt, så det finnes ingen
            // nyttig henting å starte ved navigering.
            path: 'search',
            lazy: async () => {
              const { PlatformSearchPage } = await import(
                '../pages/PlatformSearchPage.tsx'
              )

              return {
                Component: () => (
                  <RequireSuperadmin>
                    <PlatformSearchPage />
                  </RequireSuperadmin>
                ),
              }
            },
          },
          {
            path: 'users/:userId',
            loader: ({ params }) => {
              if (params.userId) {
                void queryClient.prefetchQuery(
                  platformUserDetailQueryOptions(params.userId),
                )
              }
              return null
            },
            lazy: async () => {
              const { PlatformUserPage } = await import(
                '../pages/PlatformUserPage.tsx'
              )

              return {
                Component: () => (
                  <RequireSuperadmin>
                    <PlatformUserPage />
                  </RequireSuperadmin>
                ),
              }
            },
          },
          {
            path: 'account',
            loader: () => {
              void queryClient.prefetchQuery(sessionsQueryOptions)
              return null
            },
            lazy: async () => ({
              Component: (await import('../pages/AccountPage.tsx')).AccountPage,
            }),
          },
          {
            path: 'labels',
            loader: () => {
              void queryClient.prefetchQuery(organizationListQueryOptions())
              return null
            },
            lazy: async () => {
              const { OrganizationsPage } = await import(
                '../pages/OrganizationsPage.tsx'
              )

              return {
                Component: () => (
                  <RequireSuperadmin>
                    <OrganizationsPage />
                  </RequireSuperadmin>
                ),
              }
            },
          },
          {
            path: 'labels/new',
            lazy: async () => {
              const { CreateOrganizationPage } = await import(
                '../pages/CreateOrganizationPage.tsx'
              )

              return {
                Component: () => (
                  <RequireSuperadmin>
                    <CreateOrganizationPage />
                  </RequireSuperadmin>
                ),
              }
            },
          },
          {
            path: 'labels/:organizationId',
            loader: ({ params }) => {
              if (params.organizationId) {
                void queryClient.prefetchQuery(
                  organizationDetailQueryOptions(params.organizationId),
                )
              }
              return null
            },
            lazy: async () => {
              const { OrganizationDetailPage } = await import(
                '../pages/OrganizationDetailPage.tsx'
              )

              return {
                Component: () => (
                  <RequireSuperadmin>
                    <OrganizationDetailPage />
                  </RequireSuperadmin>
                ),
              }
            },
          },
          {
            path: 'artists',
            loader: () => {
              void queryClient.prefetchQuery(artistListQueryOptions())
              return null
            },
            lazy: async () => ({
              Component: (await import('../pages/ArtistsPage.tsx')).ArtistsPage,
            }),
          },
          {
            path: 'artists/:artistId',
            loader: ({ params }) => {
              if (params.artistId) {
                void queryClient.prefetchQuery(
                  artistDetailQueryOptions(params.artistId),
                )
              }
              return null
            },
            lazy: async () => ({
              Component: (await import('../pages/ArtistDetailPage.tsx'))
                .ArtistDetailPage,
            }),
          },
          {
            path: 'artists/new',
            lazy: async () => ({
              Component: (await import('../pages/CreateArtistPage.tsx'))
                .CreateArtistPage,
            }),
          },
          {
            // Listen filtreres på det aktive arbeidsområdet, som først er
            // kjent når `/me/workspaces` har svart. En loader her ville hentet
            // feil filter.
            path: 'releases',
            lazy: async () => ({
              Component: (await import('../pages/ReleasesPage.tsx'))
                .ReleasesPage,
            }),
          },
          {
            path: 'releases/new',
            lazy: async () => ({
              Component: (await import('../pages/CreateReleasePage.tsx'))
                .CreateReleasePage,
            }),
          },
          {
            path: 'releases/:releaseId',
            loader: ({ params }) => {
              if (params.releaseId) {
                void queryClient.prefetchQuery(
                  releaseDetailQueryOptions(params.releaseId),
                )
              }
              return null
            },
            lazy: async () => ({
              Component: (await import('../pages/ReleaseDetailPage.tsx'))
                .ReleaseDetailPage,
            }),
          },
          {
            // Teamsiden velger label- eller artistvariant ut fra
            // arbeidsområdet, så hentingen kan ikke starte tidligere.
            path: 'team',
            lazy: async () => ({
              Component: (await import('../pages/LabelTeamPage.tsx'))
                .LabelTeamPage,
            }),
          },
          { path: 'forbidden', element: <ForbiddenPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorPage /> },
])
