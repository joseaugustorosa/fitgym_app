import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ColorModeProvider } from './contexts/ColorModeContext'
import { GymThemeProvider } from './contexts/GymThemeContext'
import { ProtectedRoute, GymStaffRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { AlunoShell } from './pages/aluno/AlunoShell'
import { AdminShell } from './pages/admin/AdminShell'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminAlunosPage } from './pages/admin/AdminAlunosPage'
import { AdminTreinosPage } from './pages/admin/AdminTreinosPage'
import { AdminTreinoPlanPage } from './pages/admin/AdminTreinoPlanPage'
import { AdminTreinoSessionPage } from './pages/admin/AdminTreinoSessionPage'
import { AdminExerciciosPage } from './pages/admin/AdminExerciciosPage'
import { AdminDietaPage } from './pages/admin/AdminDietaPage'
import { AdminComunidadePage } from './pages/admin/AdminComunidadePage'
import { AdminAvaliacaoPage } from './pages/admin/AdminAvaliacaoPage'
import { AdminTreinosAlunosPage } from './pages/admin/AdminTreinosAlunosPage'
import { AdminFiliaisPage } from './pages/admin/AdminFiliaisPage'
import { AdminAparenciaPage } from './pages/admin/AdminAparenciaPage'
import { PlatformShell } from './pages/platform/PlatformShell'
import { PlatformDashboardPage } from './pages/platform/PlatformDashboardPage'
import { PlatformAcademiasPage } from './pages/platform/PlatformAcademiasPage'
import { PlatformMensalidadesPage } from './pages/platform/PlatformMensalidadesPage'

export default function App() {
  return (
    <AuthProvider>
      <ColorModeProvider>
        <GymThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          <Route element={<ProtectedRoute roles={['aluno', 'gym_admin', 'professor', 'super_admin']} />}>
            <Route path="/" element={<AlunoShell />} />
          </Route>

          <Route element={<GymStaffRoute />}>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="alunos" element={<AdminAlunosPage />} />
              <Route path="avaliacao" element={<AdminAvaliacaoPage />} />
              <Route path="treinos-alunos" element={<AdminTreinosAlunosPage />} />
              <Route path="treinos" element={<AdminTreinosPage />} />
              <Route path="treinos/catalogo" element={<AdminExerciciosPage />} />
              <Route path="treinos/:planId" element={<AdminTreinoPlanPage />} />
              <Route path="treinos/:planId/sessao/:sessionId" element={<AdminTreinoSessionPage />} />
              <Route path="filiais" element={<AdminFiliaisPage />} />
              <Route path="aparencia" element={<AdminAparenciaPage />} />
              <Route path="dieta" element={<AdminDietaPage />} />
              <Route path="comunidade" element={<AdminComunidadePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['super_admin']} />}>
            <Route path="/platform" element={<PlatformShell />}>
              <Route index element={<PlatformDashboardPage />} />
              <Route path="academias" element={<PlatformAcademiasPage />} />
              <Route path="mensalidades" element={<PlatformMensalidadesPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
        </GymThemeProvider>
      </ColorModeProvider>
    </AuthProvider>
  )
}
