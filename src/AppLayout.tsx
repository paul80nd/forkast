import { NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from './components/ThemeToggle'

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
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white dark:bg-stone-100">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">
            Forkast <span aria-hidden>🍴</span>
          </span>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
