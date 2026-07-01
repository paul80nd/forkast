import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { seedDemoIfEmpty, seedDictionaryIfEmpty } from './db/seed'
import './index.css'

// Load the bundled demo dataset + seed the ingredient dictionary on first run (both no-op
// once data exists).
seedDemoIfEmpty().catch((err) => console.error('Demo seed failed:', err))
seedDictionaryIfEmpty().catch((err) => console.error('Dictionary seed failed:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
