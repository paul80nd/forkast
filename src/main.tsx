import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { seedDemoIfEmpty } from './db/seed'
import './index.css'

// Load the bundled demo dataset on first run (no-op once data exists).
seedDemoIfEmpty().catch((err) => console.error('Demo seed failed:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
