import { NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from './components/ThemeToggle'
import { BackupNudge } from './components/BackupNudge'
import { ToastProvider } from './hooks/useToast'

const tabs = [
  { to: '/browse', label: 'Browse' },
  { to: '/refine', label: 'Refine' },
  { to: '/curate', label: 'Curate' },
  { to: '/plan', label: 'Plan' },
  { to: '/shop', label: 'Shop' },
  { to: '/config', label: 'Config' },
]

export function AppLayout() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="inline-flex items-center gap-2">
            {/* Brand mark: the green "F" rounded square (matches assets/forkast-mark.svg).
                Decorative — the adjacent wordmark carries the accessible name. */}
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand font-display text-base font-bold text-white"
            >
              F
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Forkast{' '}
              <span aria-hidden className="font-sans font-normal">
                🍴
              </span>
            </span>
          </span>
          {/* On narrow screens the nav drops to its own full-width row (order-last + w-full)
              so the header never overflows; on sm+ it sits inline after the logo. */}
          <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:overflow-visible">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-tint text-brand-ink'
                      : 'text-muted hover:bg-sunken'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <BackupNudge />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      </div>
    </ToastProvider>
  )
}
