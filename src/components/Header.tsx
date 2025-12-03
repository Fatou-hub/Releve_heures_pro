import { LogOut, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showNewButton?: boolean;
}

export function Header({ title, subtitle, showNewButton = false }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNewTimesheet = () => {
    navigate('/nouveau-releve');
  };

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {title || 'Relevé Heures Pro'}
            </h1>
            {subtitle && (
              <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
            )}
            {user && !subtitle && (
              <p className="text-sm text-neutral-500 mt-0.5">
                {user.email} • {user.role === 'agence' ? 'Agence' : 'Intérimaire'}
                {user.agencyId && ` • ${user.agencyName || user.agencyId}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showNewButton && user?.role === 'agence' && (
              <button 
                onClick={handleNewTimesheet}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-medium text-sm transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau Relevé
              </button>
            )}
            {user && (
              <button 
                onClick={handleLogout}
                className="bg-white text-neutral-900 px-4 py-2 rounded-md border border-neutral-200 font-medium text-sm hover:bg-neutral-50 transition-all inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
