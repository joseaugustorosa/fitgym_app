import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StaffLayoutShell } from '../../components/StaffLayoutShell'
import { canModerateCommunity } from '../../lib/roles'
import type { UserRole } from '../../types'

const allLinks = [
  { to: '/admin', label: 'Dashboard', end: true, roles: ['gym_admin', 'professor'] as const },
  { to: '/admin/treinos-alunos', label: 'Treinos', end: false, roles: ['gym_admin', 'professor'] as const },
  { to: '/admin/alunos', label: 'Alunos', end: false, roles: ['gym_admin', 'professor'] as const },
  { to: '/admin/avaliacao', label: 'Avaliação', end: false, roles: ['gym_admin', 'professor'] as const },
  { to: '/admin/treinos', label: 'Programas', end: false, roles: ['gym_admin'] as const },
  { to: '/admin/filiais', label: 'Filiais', end: false, roles: ['gym_admin'] as const },
  { to: '/admin/dieta', label: 'Dieta', end: false, roles: ['gym_admin'] as const },
  { to: '/admin/comunidade', label: 'Comunidade', end: false, roles: ['gym_admin'] as const },
]

export function AdminShell() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'aluno'

  const links = allLinks.filter((l) => {
    if (l.to === '/admin/comunidade' && !canModerateCommunity(role)) return false
    if ((l.to === '/admin/treinos' || l.to === '/admin/dieta' || l.to === '/admin/filiais') && role !== 'gym_admin') return false
    return (l.roles as readonly UserRole[]).includes(role)
  })

  const badge = role === 'professor' ? 'FitGym Professor' : 'FitGym Admin'

  const actions = (
    <>
      {profile?.role === 'super_admin' && (
        <Link
          to="/platform"
          className="pressable rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand lg:text-sm"
        >
          Plataforma
        </Link>
      )}
      <Link
        to="/"
        className="pressable rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs font-semibold text-neutral-300 lg:text-sm"
      >
        App aluno
      </Link>
    </>
  )

  return (
    <StaffLayoutShell
      badge={badge}
      userName={profile?.name ?? 'Usuário'}
      links={links}
      actions={actions}
    />
  )
}
