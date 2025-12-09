import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AgencyDashboard } from './pages/AgencyDashboard';
import { ManageInterimaires } from './pages/ManageInterimaires';
import { TimesheetForm } from './pages/TimesheetForm';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Routes protégées - Agence */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['agence']}>
                <AgencyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-interimaires"
            element={
              <ProtectedRoute allowedRoles={['agence']}>
                <ManageInterimaires />
              </ProtectedRoute>
            }
          />

          {/* Routes protégées - Agence + Intérimaire */}
          <Route
            path="/nouveau-releve"
            element={
              <ProtectedRoute allowedRoles={['agence', 'interimaire']}>
                <TimesheetForm />
              </ProtectedRoute>
            }
          />

          {/* Routes protégées - Tous */}
          <Route
            path="/mes-releves"
            element={
              <ProtectedRoute>
                {/* TODO: Page mes relevés */}
                <div>Mes relevés (à créer)</div>
              </ProtectedRoute>
            }
          />

          {/* Route par défaut */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;