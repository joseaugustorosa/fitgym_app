import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/auth/LoginPage'
import { AlunoShell } from './pages/aluno/AlunoShell'
import { AdminShell } from './pages/admin/AdminShell'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminAlunosPage } from './pages/admin/AdminAlunosPage'
import { AdminTreinosPage } from './pages/admin/AdminTreinosPage'
import { AdminDietaPage } from './pages/admin/AdminDietaPage'
import { AdminComunidadePage } from './pages/admin/AdminComunidadePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AlunoShell />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="alunos" element={<AdminAlunosPage />} />
              <Route path="treinos" element={<AdminTreinosPage />} />
              <Route path="dieta" element={<AdminDietaPage />} />
              <Route path="comunidade" element={<AdminComunidadePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
