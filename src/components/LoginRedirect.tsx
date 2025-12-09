import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Redirection selon le rôle
      if (user.role === 'agence') {
        navigate('/dashboard', { replace: true });
      } else if (user.role === 'interimaire') {
        navigate('/nouveau-releve', { replace: true });
      } else {
        navigate('/mes-releves', { replace: true });
      }
    }
  }, [user, navigate]);

  return null; // Ce composant ne rend rien
}