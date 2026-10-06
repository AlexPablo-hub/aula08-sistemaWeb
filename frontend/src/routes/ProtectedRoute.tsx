import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/** Rotas internas: sem sessão, leva a /entrar. */
export function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()
  if (!accessToken) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Rotas de visitante (entrar, cadastrar): com sessão, leva a /app. */
export function GuestRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (accessToken) {
    return <Navigate to="/app" replace />
  }
  return <Outlet />
}

/** Rota de administrador: sem sessão leva a /entrar; papel user leva a /app. */
export function AdminRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.user?.role)
  const location = useLocation()
  if (!accessToken) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  if (role !== 'admin') {
    return <Navigate to="/app" replace />
  }
  return <Outlet />
}
