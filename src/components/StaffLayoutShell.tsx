import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ColorModeToggle } from './ColorModeToggle'
import type { ReactNode } from 'react'

export type StaffNavLink = {
  to: string
  label: string
  end?: boolean
}

interface StaffLayoutShellProps {
  badge: string
  userName: string
  links: StaffNavLink[]
  actions?: ReactNode
}

function navClass(isActive: boolean, compact = false) {
  if (compact) {
    return `shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-brand text-white' : 'glass-panel text-neutral-400'
    }`
  }
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-brand/15 text-brand'
      : 'text-neutral-400 hover:bg-[var(--color-hover-subtle)] hover:text-neutral-200'
  }`
}

export function StaffLayoutShell({ badge, userName, links, actions }: StaffLayoutShellProps) {
  const { logout } = useAuth()

  return (
    <div className="staff-shell flex h-full w-full">
      <aside className="staff-sidebar hidden w-64 shrink-0 flex-col border-r border-[var(--color-panel-border)] bg-surface-2/80 lg:flex">
        <div className="border-b border-[var(--color-panel-border)] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display text-sm font-extrabold text-white">
              FG
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
                {badge}
              </p>
              <p className="truncate text-sm font-semibold text-neutral-200">{userName}</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => navClass(isActive)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-[var(--color-panel-border)] p-3">
          <ColorModeToggle compact />
          {actions}
          <button
            type="button"
            onClick={() => logout()}
            className="pressable rounded-xl bg-surface-3 px-3 py-2.5 text-left text-sm font-semibold text-neutral-300"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-panel-border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">{badge}</p>
            <h1 className="truncate font-display text-lg font-bold">{userName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ColorModeToggle compact />
            {actions}
            <button
              type="button"
              onClick={() => logout()}
              className="pressable rounded-xl bg-surface-3 px-3 py-2 text-xs font-semibold text-neutral-300"
            >
              Sair
            </button>
          </div>
        </header>

        <header className="hidden items-center justify-between border-b border-[var(--color-panel-border)] px-8 py-5 lg:flex">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{badge}</h1>
            <p className="mt-0.5 text-sm text-neutral-400">Olá, {userName}</p>
          </div>
          <div className="flex items-center gap-2">
            <ColorModeToggle compact />
            {actions}
          </div>
        </header>

        <nav className="scroll-area flex gap-1.5 overflow-x-auto border-b border-[var(--color-panel-border)] px-2 py-2.5 lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => navClass(isActive, true)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <main className="staff-main scroll-area page-enter flex-1 overflow-y-auto">
          <div className="staff-main-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
