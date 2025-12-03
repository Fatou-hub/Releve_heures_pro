import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clipboard, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // La redirection sera gérée par le router selon le rôle
        navigate('/');
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-neutral-200 p-8">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
              <Clipboard className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-neutral-900 mb-2">
            Relevé Heures Pro
          </h1>
          <p className="text-center text-neutral-500 text-sm mb-8">
            Connectez-vous à votre compte
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="vous@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-4">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
