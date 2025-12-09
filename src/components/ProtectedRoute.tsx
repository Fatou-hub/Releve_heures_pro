import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('agence' | 'interimaire' | 'client')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-neutral-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas connecté, rediriger vers login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si des rôles sont spécifiés, vérifier que l'utilisateur a le bon rôle
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Rediriger vers la page appropriée selon le rôle
    if (user.role === 'agence') {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === 'interimaire') {
      return <Navigate to="/nouveau-releve" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  // Utilisateur autorisé, afficher le contenu
  return <>{children}</>;
}