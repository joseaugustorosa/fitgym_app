import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, profile, loading, isDemo } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface text-neutral-400">
        Carregando…
      </div>
    )
  }

  if ((!user && !isDemo) || !profile) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }

  return <Outlet />
}
