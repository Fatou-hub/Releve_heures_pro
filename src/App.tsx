import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { Dashboard } from './pages/Dashboard';
import { TimesheetForm } from './pages/TimesheetForm';
import { ValidationPage } from './pages/ValidationPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/" replace /> : <SignupPage />} 
        />
        
        {/* Route de validation client (publique avec token) */}
        <Route path="/validation" element={<ValidationPage />} />

        {/* Routes protégées */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['agence']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nouveau-releve"
          element={
            <ProtectedRoute allowedRoles={['interimaire', 'agence']}>
              <TimesheetForm />
            </ProtectedRoute>
          }
        />

        {/* Route par défaut - Redirection selon le rôle */}
        <Route
          path="/"
          element={
            user ? (
              user.role === 'agence' ? (
                <Navigate to="/dashboard" replace />
              ) : user.role === 'interimaire' ? (
                <Navigate to="/nouveau-releve" replace />
              ) : (
                <Navigate to="/validation" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
