import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { homeRoute, isGymStaff } from '../lib/roles'
import type { UserRole } from '../types'

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface text-neutral-400">
        Carregando…
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={homeRoute(profile.role)} replace />
  }

  return <Outlet />
}

export function GymStaffRoute() {
  const { profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface text-neutral-400">
        Carregando…
      </div>
    )
  }

  if (!profile || !isGymStaff(profile.role)) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
