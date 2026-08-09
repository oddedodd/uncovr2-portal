import { RouterProvider } from 'react-router'
import { router } from './app/router.tsx'

export default function App() {
  return <RouterProvider router={router} />
}
