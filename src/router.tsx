import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { BrowsePage } from './pages/BrowsePage'
import { RefinePage } from './pages/RefinePage'
import { CuratePage } from './pages/CuratePage'
import { PlanPage } from './pages/PlanPage'
import { ShopPage } from './pages/ShopPage'
import { RecipePage } from './pages/RecipePage'
import { ConfigPage } from './pages/ConfigPage'

// HashRouter: works on static hosting (GitHub Pages) and local serving with no
// server-side rewrite config — refreshes never 404.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/browse" replace /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'recipe/:id', element: <RecipePage /> },
      { path: 'refine', element: <RefinePage /> },
      { path: 'curate', element: <CuratePage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'config', element: <ConfigPage /> },
    ],
  },
])
