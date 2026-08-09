import { createBrowserRouter } from 'react-router'
import { PortalLayout } from '../components/PortalLayout.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PortalLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
