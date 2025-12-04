import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Clipboard, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Afficher le message de succès si on vient de reset-password
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Effacer le message après 5 secondes
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location]);

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

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResetLoading(true);
    setResetSuccess(false);

    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetSuccess(true);
      }
    } catch (err) {
      setError('Une erreur est survenue lors de l\'envoi de l\'email');
    } finally {
      setResetLoading(false);
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

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-neutral-900">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-xs text-primary hover:underline"
                  disabled={loading}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3.5 py-2.5 pr-10 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
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

        {/* Modal de réinitialisation de mot de passe */}
        {showResetPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-neutral-200 p-8 w-full max-w-md">
              <h2 className="text-xl font-bold text-neutral-900 mb-2">
                Réinitialiser le mot de passe
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {resetSuccess ? (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Email envoyé ! Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-900 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      placeholder="vous@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={resetLoading}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(false);
                        setResetEmail('');
                        setError('');
                        setResetSuccess(false);
                      }}
                      className="flex-1 px-5 py-2.5 border border-neutral-200 rounded-md font-medium text-sm text-neutral-700 hover:bg-neutral-50 transition-all"
                      disabled={resetLoading}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-md font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={resetLoading}
                    >
                      {resetLoading ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </form>
              )}

              {resetSuccess && (
                <button
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetEmail('');
                    setError('');
                    setResetSuccess(false);
                  }}
                  className="w-full mt-4 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-md font-medium text-sm transition-all"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
