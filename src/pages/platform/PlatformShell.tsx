import { StaffLayoutShell } from '../../components/StaffLayoutShell'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/platform', label: 'Dashboard', end: true },
  { to: '/platform/academias', label: 'Academias', end: false },
  { to: '/platform/mensalidades', label: 'Mensalidades', end: false },
]

export function PlatformShell() {
  const { profile } = useAuth()

  return (
    <StaffLayoutShell
      badge="FitGym Plataforma"
      userName={profile?.name ?? 'Super Admin'}
      links={links}
    />
  )
}
