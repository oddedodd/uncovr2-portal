import { createBrowserRouter } from 'react-router'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { PortalLayout } from '../components/PortalLayout.tsx'
import { RequireAuth } from '../components/RequireAuth.tsx'
import { RequireSuperadmin } from '../components/RequireSuperadmin.tsx'
import { AccountPage } from '../pages/AccountPage.tsx'
import { AcceptArtistInvitationPage } from '../pages/AcceptArtistInvitationPage.tsx'
import { AcceptOrganizationInvitationPage } from '../pages/AcceptOrganizationInvitationPage.tsx'
import { ArtistsPage } from '../pages/ArtistsPage.tsx'
import { CreateArtistPage } from '../pages/CreateArtistPage.tsx'
import { CreateOrganizationPage } from '../pages/CreateOrganizationPage.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { OrganizationDetailPage } from '../pages/OrganizationDetailPage.tsx'
import { OrganizationsPage } from '../pages/OrganizationsPage.tsx'
import { PlatformSearchPage } from '../pages/PlatformSearchPage.tsx'
import { PlatformUserPage } from '../pages/PlatformUserPage.tsx'
import { LabelTeamPage } from '../pages/LabelTeamPage.tsx'
import { InvitationEntryPage } from '../pages/InvitationEntryPage.tsx'
import { WorkspaceSectionPage } from '../pages/WorkspaceSectionPage.tsx'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.tsx'
import { LoginPage } from '../pages/auth/LoginPage.tsx'
import { RegisterPage } from '../pages/auth/RegisterPage.tsx'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage.tsx'
import { SessionExpiredPage } from '../pages/auth/SessionExpiredPage.tsx'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage.tsx'
import { ForbiddenPage } from '../pages/states/ForbiddenPage.tsx'
import { RouteErrorPage } from '../pages/states/RouteErrorPage.tsx'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/session-expired', element: <SessionExpiredPage /> },
      {
        path: '/invitations/accept',
        element: (
          <InvitationEntryPage kind="label">
            <AcceptOrganizationInvitationPage />
          </InvitationEntryPage>
        ),
      },
      {
        path: '/artist-invitations/accept',
        element: (
          <InvitationEntryPage kind="artist">
            <AcceptArtistInvitationPage />
          </InvitationEntryPage>
        ),
      },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/',
        element: <PortalLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'search',
            element: (
              <RequireSuperadmin>
                <PlatformSearchPage />
              </RequireSuperadmin>
            ),
          },
          {
            path: 'users/:userId',
            element: (
              <RequireSuperadmin>
                <PlatformUserPage />
              </RequireSuperadmin>
            ),
          },
          { path: 'account', element: <AccountPage /> },
          {
            path: 'labels',
            element: (
              <RequireSuperadmin>
                <OrganizationsPage />
              </RequireSuperadmin>
            ),
          },
          {
            path: 'labels/new',
            element: (
              <RequireSuperadmin>
                <CreateOrganizationPage />
              </RequireSuperadmin>
            ),
          },
          {
            path: 'labels/:organizationId',
            element: (
              <RequireSuperadmin>
                <OrganizationDetailPage />
              </RequireSuperadmin>
            ),
          },
          { path: 'artists', element: <ArtistsPage /> },
          { path: 'artists/new', element: <CreateArtistPage /> },
          { path: 'releases', element: <WorkspaceSectionPage /> },
          { path: 'team', element: <LabelTeamPage /> },
          { path: 'forbidden', element: <ForbiddenPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorPage /> },
])
