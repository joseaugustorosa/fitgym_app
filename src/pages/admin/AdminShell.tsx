import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/alunos', label: 'Alunos' },
  { to: '/admin/treinos', label: 'Treinos' },
  { to: '/admin/dieta', label: 'Dieta' },
  { to: '/admin/comunidade', label: 'Comunidade' },
]

export function AdminShell() {
  const { profile, logout } = useAuth()

  return (
    <div className="app-shell mx-auto flex h-full max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b border-white/6 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            FitGym Admin
          </p>
          <h1 className="font-display text-lg font-bold">{profile?.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="pressable rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs font-semibold text-neutral-300"
          >
            App aluno
          </Link>
          <button
            onClick={() => logout()}
            className="pressable rounded-xl bg-surface-3 px-3 py-2 text-xs font-semibold text-neutral-300"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="scroll-area flex gap-1.5 overflow-x-auto border-b border-white/6 px-2 py-2.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand text-white' : 'glass-panel text-neutral-400'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main className="page-enter scroll-area flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  )
}
